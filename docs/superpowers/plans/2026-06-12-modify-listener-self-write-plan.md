# modify 监听器排除自身写入实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 插件自身写入 `{year}.md` 时不触发 `modify` 监听器的 `refreshCardWall`，避免无意义的全量重解析。

**架构：** 插件类维护 `Set<string>` 记录正在写入的文件路径，写入前 add、写入后（finally）delete。监听器命中则跳过。

**技术栈：** TypeScript, Obsidian Plugin API

---

### 任务 1：`record-generator.ts` — `appendToYearFile` 和 `createRecordFile` 签名扩展

**文件：**
- 修改：`src/record-generator.ts:127-178`（`appendToYearFile`）
- 修改：`src/record-generator.ts:192-224`（`createRecordFile`）

- [ ] **步骤 1：`appendToYearFile` 新增 `writingPaths` 参数，用 `try/finally` 包裹 `vault.modify`**

将函数签名从：

```ts
export async function appendToYearFile(
    app: App,
    content: string,
    folder: string,
    watchDate: string | null,
    contentType: 'movie' | 'tv'
): Promise<TFile> {
```

改为：

```ts
export async function appendToYearFile(
    app: App,
    content: string,
    folder: string,
    watchDate: string | null,
    contentType: 'movie' | 'tv',
    writingPaths: Set<string>
): Promise<TFile> {
```

将 `src/record-generator.ts:176` 的：

```ts
    await app.vault.modify(file, sortedContent);
    return file;
```

改为：

```ts
    writingPaths.add(file.path);
    try {
        await app.vault.modify(file, sortedContent);
    } finally {
        writingPaths.delete(file.path);
    }
    return file;
```

- [ ] **步骤 2：`createRecordFile` 新增 `writingPaths` 参数并透传**

将函数签名从：

```ts
export async function createRecordFile(
    app: App,
    content: string,
    folder: string,
    fileName: string,
    watchDate?: string | null,
    contentType?: 'movie' | 'tv'
): Promise<TFile> {
```

改为：

```ts
export async function createRecordFile(
    app: App,
    content: string,
    folder: string,
    fileName: string,
    watchDate?: string | null,
    contentType?: 'movie' | 'tv',
    writingPaths?: Set<string>
): Promise<TFile> {
```

将 `src/record-generator.ts:200-201` 的：

```ts
    if (watchDate !== undefined && contentType) {
        return appendToYearFile(app, content, folder, watchDate, contentType);
    }
```

改为：

```ts
    if (watchDate !== undefined && contentType) {
        return appendToYearFile(app, content, folder, watchDate, contentType, writingPaths ?? new Set());
    }
```

---

### 任务 2：`main.ts` — 插件类新增字段、监听器加跳过、调用方传参

**文件：**
- 修改：`src/main.ts:91-93`（插件类字段）
- 修改：`src/main.ts:183-189`（modify 监听器）
- 修改：`src/main.ts:129`（电影记录创建调用）
- 修改：`src/main.ts:164`（剧集记录创建调用）

- [ ] **步骤 1：插件类新增 `writingPaths` 字段**

在 `src/main.ts:92` `settings: PluginSettings;` 下方新增一行：

```ts
    private writingPaths = new Set<string>();
```

- [ ] **步骤 2：监听器加跳过判断**

在 `src/main.ts:184` 行（`if (file instanceof TFile && file.extension === 'md') {`）之后新增：

```ts
                        if (this.writingPaths.has(file.path)) return;
```

完整上下文：

```ts
                this.app.vault.on('modify', (file) => {
                    if (file instanceof TFile && file.extension === 'md') {
                        if (this.writingPaths.has(file.path)) return;
                        const saveFolder = this.settings.defaultSaveFolder.replace(/^\/|\/$/g, '');
                        if (file.path.startsWith(saveFolder + '/')) {
                            this.refreshCardWall();
                        }
                    }
                })
```

- [ ] **步骤 3：电影记录创建调用传入 `writingPaths`**

将 `src/main.ts:129` 的：

```ts
                                const file = await createRecordFile(this.app, content, this.settings.defaultSaveFolder, fileName, userInput.watchDate || null, 'movie');
```

改为：

```ts
                                const file = await createRecordFile(this.app, content, this.settings.defaultSaveFolder, fileName, userInput.watchDate || null, 'movie', this.writingPaths);
```

- [ ] **步骤 4：剧集记录创建调用传入 `writingPaths`**

将 `src/main.ts:164` 的：

```ts
                                        const file = await createRecordFile(this.app, content, this.settings.defaultSaveFolder, fileName, userInput.watchDate || null, 'tv');
```

改为：

```ts
                                        const file = await createRecordFile(this.app, content, this.settings.defaultSaveFolder, fileName, userInput.watchDate || null, 'tv', this.writingPaths);
```

---

### 任务 3：验证

- [ ] **步骤 1：类型检查**

```bash
npm run build
```
预期：tsc 无错误，esbuild 成功产出 `main.js`。

- [ ] **步骤 2：Lint 检查**

```bash
npm run lint
```
预期：无 lint 错误。

- [ ] **步骤 3：Commit**

```bash
git add src/main.ts src/record-generator.ts
git commit -m "fix: modify listener skips self-writes to year files"
```
