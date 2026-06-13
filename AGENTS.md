# AGENTS.md

## Project

Obsidian plugin for movie/TV watch tracking with TMDB integration. Single-package TypeScript project, not a monorepo.

## Commands

- `npm run dev` — esbuild watch mode for development
- `npm run build` — typecheck (`tsc -noEmit -skipLibCheck`) then esbuild production bundle
- `npm run lint` — ESLint with `eslint-plugin-obsidianmd` + `typescript-eslint`
- `npm run version` — bumps `manifest.json` and `versions.json` from `package.json` version

No test framework is configured. Verification = lint + build.

## Architecture

Entrypoint: `src/main.ts` → bundled to `main.js` via esbuild (`esbuild.config.mjs`).

Source files in `src/`:
- `main.ts` — Plugin class, commands, ribbon icon, event wiring
- `types.ts` — All TypeScript interfaces, enums, default settings
- `settings.ts` — Plugin settings tab UI
- `tmdb-api.ts` — TMDB REST API calls (uses `requestUrl` from Obsidian, not `fetch`)
- `record-generator.ts` — Markdown template generation, year-file append logic
- `card-wall-view.ts` — `ItemView` subclass for poster wall display
- `search-modal.ts` — TMDB search modal UI
- `season-modal.ts` — Season selection modal UI

## Key Conventions

- **`main.js` is generated** — never edit it directly; edit `src/*.ts` and rebuild.
- **`styles.css` is a source file** — not generated, ships as-is with the plugin.
- **`manifest.json` / `versions.json`** — updated by `npm run version` (via `version-bump.mjs`). Don't hand-edit versions.
- **Indentation**: tabs (width 4), per `.editorconfig`.
- **esbuild externals**: `obsidian`, `electron`, all `@codemirror/*`, `@lezer/*`, and Node builtins. These are resolved at runtime by Obsidian.
- **TMDB API**: uses `requestUrl` (Obsidian API), not browser `fetch`. All API calls go through `src/tmdb-api.ts`.
- **UI language**: Chinese (zh-CN) is the default and primary language for all user-facing strings.
- **Record storage**: watch records are stored as Markdown inside year-files (`{folder}/{year}.md`) with YAML frontmatter stats.

## Release

Push a git tag → `.github/workflows/release.yml` builds and creates a GitHub release with `main.js`, `manifest.json`, `styles.css`.

### 发布流程

每次发布按以下步骤操作：

1. **确认代码就绪**
   - `npm run lint` 通过（仅 `src/` 下的错误需关注）
   - `npm run build` 通过（typecheck + esbuild）

2. **更新 CHANGELOG.md**
   - 在文件顶部按格式新增版本条目：
     ```markdown
     ## [x.y.z] - YYYY-MM-DD

     ### 新增 / 修复 / 优化

     - 变更说明
     ```
   - 提交：`git add CHANGELOG.md && git commit -m "docs: 更新 CHANGELOG vx.y.z"`

3. **更新版本号**
   - 修改 `package.json` 中的 `version` 字段为目标版本
   - 运行 `npm run version`（自动同步 `manifest.json` 和 `versions.json`）
   - 提交：`git add package.json manifest.json versions.json && git commit -m "chore: bump version to x.y.z"`

4. **打 tag 并推送**
   ```bash
   git tag -a x.y.z -m "x.y.z: 简要说明"
   git push origin main --tags
   ```

5. **验证 GitHub Release**
   - 检查 Actions 是否成功：https://github.com/zzditto/MovieLog/actions
   - 确认 Release 页面有 `main.js`、`manifest.json`、`styles.css` 三个附件
   - 确认 Release 说明从 CHANGELOG 正确提取

### 发布故障处理

- **Release 已存在导致 Actions 失败**：先删除 GitHub 上的 Release（Releases → 对应版本 → Edit → Delete release），再删除本地和远程 tag 后重新推送：
  ```bash
  git tag -d x.y.z
  git push origin :refs/tags/x.y.z
  git tag -a x.y.z -m "x.y.z: 说明"
  git push origin x.y.z
  ```
- **Release 说明为空**：检查 CHANGELOG.md 中版本号格式是否为 `## [x.y.z]`（不带 `v` 前缀），workflow 通过 `[x.y.z]` 匹配
