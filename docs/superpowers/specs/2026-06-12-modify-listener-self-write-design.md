# modify 监听器排除自身写入设计

> 对应 review 文档 `02-stability.md` 中的 `02-02`

## 问题

`src/main.ts:183-191` 的 `modify` 监听器未排除插件自身写入的 `{year}.md`。每次 `record-generator.ts:176` 调用 `vault.modify` 写回年份文件，都会触发 `refreshCardWall`，进而触发全量重解析。用户每次添加一条记录都会触发一次全库重读。

## 方案：路径 Set 排除法

插件维护一个 `Set<string>`，记录"插件正在写入的文件路径"。写入前 add，写入后（finally）delete。监听器中检查命中则跳过。

## 改动范围

2 个文件，4 处修改。

### 1. `src/main.ts` — 插件类新增字段

```ts
private writingPaths = new Set<string>();
```

### 2. `src/record-generator.ts` — `appendToYearFile` 签名扩展

新增 `writingPaths: Set<string>` 参数，在 `vault.modify` 前后用 `try/finally` 标记：

```ts
export async function appendToYearFile(
    app: App,
    content: string,
    folder: string,
    watchDate: string,
    contentType: 'movie' | 'tv',
    writingPaths: Set<string>
): Promise<TFile> {
    // ... 现有逻辑不变 ...
    writingPaths.add(file.path);
    try {
        await app.vault.modify(file, sortedContent);
    } finally {
        writingPaths.delete(file.path);
    }
    return file;
}
```

### 3. `src/main.ts` — 监听器加跳过判断

```ts
this.app.vault.on('modify', (file) => {
    if (file instanceof TFile && file.extension === 'md') {
        if (this.writingPaths.has(file.path)) return;
        const saveFolder = this.settings.defaultSaveFolder.replace(/^\/|\/$/g, '');
        if (file.path.startsWith(saveFolder + '/')) {
            this.refreshCardWall();
        }
    }
});
```

### 4. `src/main.ts` — 调用方传参

`createRecordFile` 调用 `appendToYearFile` 时传入 `this.writingPaths`。

## 数据流

```
添加记录 → createRecordFile(writingPaths)
  → appendToYearFile(writingPaths)
    → writingPaths.add(file.path)
    → vault.modify({year}.md)  ←── modify 事件触发
      → 监听器检查 writingPaths.has(file.path) → true → 跳过
    → writingPaths.delete(file.path) (finally)
```

用户手动编辑 `{year}.md`：

```
用户编辑 → vault 自动保存 → modify 事件触发
  → 监听器检查 writingPaths.has(file.path) → false → refreshCardWall
```

## 边界情况

- **异常路径**：`vault.modify` 抛异常时，`finally` 保证路径被移除，不会永久阻塞
- **并发写入**：Set 天然支持，两个 `appendToYearFile` 同时写不同文件互不干扰
- **用户编辑同一文件**：插件写入完成后路径已从 Set 移除，用户紧接着编辑同一文件不会被误跳过
