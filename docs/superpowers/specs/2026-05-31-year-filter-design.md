# 海报墙年份筛选框 — 设计文档

> 日期：2026-05-31 | 状态：已确认

## 概述

在海报墙（MovieLog Card Wall）视图 header 右上角新增一个年份下拉筛选框，用户可按年份过滤观影记录。

## 需求

- **位置**：header 区域右上角，与"观影记录"标题同行
- **维度**：仅按年份筛选
- **UI 形式**：原生 HTML `<select>` 下拉选择器
- **样式**：配色与海报墙整体风格一致（暖色系、圆角）

## 改动范围

| 文件 | 改动内容 |
|------|----------|
| `src/card-wall-view.ts` | header 渲染中插入 `<select>`；新增 `selectedYear` 字段和筛选重渲染逻辑 |
| `styles.css` | 新增 `.movielog-year-filter` 样式 |
| 无其他文件 | `types.ts` / `main.ts` / `settings.ts` 无需改动 |

## DOM 结构

在原 `.movielog-poster-header` 内部右侧插入年份筛选框：

```
.movielog-poster-header
├── (现有) .movielog-stats-title     ← 标题，如 "观影记录（2025年）"
├── (现有) .movielog-stats-sub       ← 统计
└── (新增) .movielog-year-filter
    └── <select>
        ├── <option value="">全部年份</option>
        ├── <option value="2025">2025（8部）</option>
        └── <option value="2024">2024（4部）</option>
```

## 数据流

```
parseAllYearFiles()
  ├── 解析所有年份文件 → records[]
  └── 提取年份集合 → populate <select>

用户选择年份 → onchange
  ├── 过滤 records 中 year === selectedYear
  ├── sortRecords(filtered)
  └── 重新渲染 header（标题 + 统计 + 卡片列表）
```

## 行为细节

1. **默认状态**：`<option value="">全部年份</option>` 为默认选中项，显示所有记录
2. **选项标签**：每个年份显示对应记录数，格式 `2025（8部）`
3. **筛选 + 排序共存**：筛选后仍遵循 `settings.sortBy` 排序规则
4. **标题联动**：选择单一年份时标题显示 `观影记录（2025年）`；选"全部年份"时不显示年份
5. **统计联动**：统计文字根据筛选结果动态更新
6. **状态存储**：筛选状态（`selectedYear`）仅存在于 `MovieLogView` 实例中，不持久化到设置。每次打开/刷新海报墙时恢复为"全部年份"
7. **年份来源**：从记录的实际年份数据中动态提取，而非从设置或固定列表

## 实现要点

### `card-wall-view.ts` 变更

**新增字段**（约第 30 行，`MovieLogView` 类内）：

```typescript
private selectedYear: string | null = null;
```

**`renderCards()` 方法改造**（约第 72-100 行）：

- 解析记录后，提取所有年份并统计每个年份的记录数
- 在 header div 中以 flex 布局容纳标题区（左侧）和筛选框（右侧）
- 插入 `<select>` 元素，绑定 `onchange` 事件
- `onchange` 中：更新 `selectedYear`，重新执行筛选 → 排序 → 渲染

**新增筛选方法**：

```typescript
private getFilteredRecords(records: ParsedRecord[]): ParsedRecord[] {
    if (!this.selectedYear) return records;
    return records.filter(r => r.year === this.selectedYear);
}
```

**`refreshCards()` 行为**：重置 `selectedYear = null`，确保刷新后恢复全部显示。

### `styles.css` 新增样式

```css
.movielog-poster-header {
    /* 现有改为 flex 布局 */
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.movielog-year-filter select {
    background: #faf8f5;
    border: 1.5px solid #d9cdc0;
    border-radius: 8px;
    padding: 6px 28px 6px 10px;
    font-size: 13px;
    color: #3d3229;
    cursor: pointer;
    font-family: inherit;
    appearance: auto;
}

.movielog-year-filter select:hover {
    border-color: #c4a88c;
}

.movielog-year-filter select:focus {
    outline: none;
    border-color: #a08060;
    box-shadow: 0 0 0 2px rgba(160, 128, 96, 0.15);
}
```

同时 `.movielog-poster-header` 需要改为 flex 布局以容纳左右两栏（标题组在左，筛选框在右）。

## 不复用的内容

- **不新增设置项**：年份筛选是视图内状态，不写入 `PluginSettings`
- **不修改 `types.ts`**：无需新增接口或枚举
- **不修改 `main.ts`**：无需新增命令或事件
- **不影响添加记录流程**：`search-modal.ts` / `record-generator.ts` 不涉及
