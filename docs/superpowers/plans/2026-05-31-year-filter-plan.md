# 海报墙年份筛选框 — 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在海报墙 header 右上角添加原生 `<select>` 年份下拉筛选框，支持按年份过滤记录。

**架构：** 在 `MovieLogView` 类中新增 `allRecords` 缓存和 `selectedYear` 状态；将渲染逻辑拆分为文件解析（一次性）和视图渲染（可重复调用）；筛选变更时仅重新渲染视图，不重复解析文件。

**技术栈：** TypeScript（Obsidian Plugin API），CSS（原生 select 样式）

---

### 任务 1：CSS — header 布局改为 flex + 筛选框样式

**文件：**
- 修改：`styles.css:267-270`（`.movielog-poster-header`）
- 新增：`styles.css` 末尾（`.movielog-year-filter` 及 `.movielog-header-left`）

- [ ] **步骤 1：修改 `.movielog-poster-header` 为 flex 布局，新增左侧标题包装器**

在 `styles.css` 中，找到 `.movielog-poster-header` 块（第 267-270 行），替换为：

```css
.movielog-poster-header {
    padding: 16px 16px 0;
    margin-bottom: 24px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.movielog-header-left {
    flex: 1;
    min-width: 0;
}
```

- [ ] **步骤 2：新增 `.movielog-year-filter` 及 `select` 样式**

在 `styles.css` 末尾追加：

```css
/* ===== Year Filter ===== */
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
    flex-shrink: 0;
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

- [ ] **步骤 3：验证 CSS**

运行 `npm run build`，确认编译无错误。

---

### 任务 2：TypeScript — 核心筛选逻辑

**文件：**
- 修改：`src/card-wall-view.ts`

- [ ] **步骤 1：新增 `allRecords` 和 `selectedYear` 字段**

在 `MovieLogView` 类内（约第 31 行，`private resizeObserver` 下方）添加：

```typescript
    private allRecords: ParsedRecord[] = [];
    private selectedYear: string | null = null;
```

- [ ] **步骤 2：重构 `renderCards()` — 缓存记录并委托渲染**

将 `renderCards()` 方法（第 72-100 行）替换为：

```typescript
    private async renderCards(container: HTMLElement): Promise<void> {
        this.allRecords = await this.parseAllYearFiles();
        this.renderFilteredView(container);
    }
```

- [ ] **步骤 3：新增 `renderFilteredView()` 方法**

在 `renderCards()` 方法下方新增（原第 100 行之后）：

```typescript
    private renderFilteredView(container: HTMLElement): void {
        container.empty();

        const filtered = this.selectedYear
            ? this.allRecords.filter(r => r.year === this.selectedYear)
            : this.allRecords;

        if (filtered.length === 0) {
            const emptyState = container.createDiv({ cls: 'movielog-empty-state' });
            emptyState.createEl('p', { text: '还没有观影记录' });
            emptyState.createEl('p', { text: '使用命令面板添加你的第一部电影或剧集！' });
            return;
        }

        this.sortRecords(filtered);

        const totalMovies = filtered.filter(r => r.type === 'movie').length;
        const totalTvShows = filtered.filter(r => r.type === 'tv').length;

        const header = container.createDiv({ cls: 'movielog-poster-header' });

        const headerLeft = header.createDiv({ cls: 'movielog-header-left' });
        headerLeft.createDiv({
            cls: 'movielog-stats-title',
            text: this.selectedYear
                ? `观影记录（${this.selectedYear}年）`
                : '观影记录'
        });
        headerLeft.createDiv({
            cls: 'movielog-stats-sub',
            text: `统计：共 ${filtered.length} 部作品（电影 ${totalMovies} 部 ｜ 电视剧 ${totalTvShows} 部）`
        });

        const yearFilter = header.createDiv({ cls: 'movielog-year-filter' });
        const select = yearFilter.createEl('select');

        const years = [...new Set(this.allRecords.map(r => r.year).filter(Boolean))].sort((a, b) => b.localeCompare(a));

        select.createEl('option', { text: '全部年份', attr: { value: '' } });
        if (!this.selectedYear) {
            (select.options[0] as HTMLOptionElement).selected = true;
        }

        for (const year of years) {
            const count = this.allRecords.filter(r => r.year === year).length;
            const option = select.createEl('option', {
                text: `${year}（${count}部）`,
                attr: { value: year }
            });
            if (year === this.selectedYear) {
                option.selected = true;
            }
        }

        select.addEventListener('change', () => {
            this.selectedYear = select.value || null;
            this.renderFilteredView(container);
        });

        const grid = container.createDiv({ cls: 'movielog-poster-wall' });

        for (let i = 0; i < filtered.length; i++) {
            const record = filtered[i]!;
            const colorTheme = COLOR_THEMES[i % COLOR_THEMES.length]!;
            this.renderPosterCard(grid, record, colorTheme);
        }
    }
```

- [ ] **步骤 4：修改 `refreshCards()` — 重置筛选状态**

将 `refreshCards()` 方法（第 65-70 行）替换为：

```typescript
    async refreshCards(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement | undefined;
        if (!container) return;
        this.selectedYear = null;
        await this.renderCards(container);
    }
```

- [ ] **步骤 5：删除 `renderCards()` 中不再需要的单一年份标题逻辑**

原 `renderCards()` 中第 88-90 行的 `yearSet` / `yearText` 逻辑已由 `renderFilteredView()` 中的标题逻辑替代，删除后无需额外处理（步骤 2 已整体替换）。验证 `npm run build` 无编译错误。

---

### 任务 3：验证

- [ ] **步骤 1：构建验证**

```bash
npm run build
```
预期：TypeScript 编译无错误，esbuild 输出 `main.js`。

- [ ] **步骤 2：Lint 验证**

```bash
npm run lint
```
预期：无 ESLint 错误。

- [ ] **步骤 3：提交**

```bash
git add styles.css src/card-wall-view.ts
git commit -m "feat: 海报墙新增年份下拉筛选框"
```
