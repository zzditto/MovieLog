# Changelog

## [0.8.5] - 2026-10-18

### 优化

- 修复发布后社区审核报告 38 处类型警告的根因：`tsconfig.json` 的 `lib` 由 `["DOM","ES5","ES6","ES7"]` 声明为 `["DOM","ES2022"]`，如实描述代码所用的语言层，不再由 `@types/node` 等开发依赖隐性决定
- 新增 `npm run audit:types`（`tsconfig.audit.json`，与主配置仅差 `types: []`）以在本地复现审核环境，并接入 Release 工作流，使同类回归在打 tag 前失败而非发布后才发现
- 移除为迁就过低 `lib` 而写的补偿代码，数组展开、键枚举与日期补零恢复标准库写法（`flat`、`Object.entries`/`Object.fromEntries`、`padStart`）
- 设置项 key 收敛为单一来源，声明式与命令式两套渲染及写值入口均由同一注册表派生，避免任一侧新增设置项被遗漏
- Release 工作流新增 `npm test` 质量门，此前测试套件未纳入发布校验

本次为内部质量修复，无用户可见的行为变化。

## [0.8.4] - 2026-07-28

### 修复

- 校验观看日期与个人评分，使用本地日期，避免 UTC 时区导致日期写入错误
- 修复空个人评分解析为 `NaN`、历史异常评分中断卡片墙渲染的问题
- 修复个人评分为 0 时未正确保留的显示问题，现显示为 `0.0/10`
- 修复电视剧不同季度及电影/剧集同 ID 的本地海报缓存冲突
- 限制 TMDB 持久缓存大小并清理过期、畸形缓存数据
- 使用电影/剧集专用搜索端点，避免较早搜索响应覆盖最新结果

### 优化

- 新增记录解析、评分显示、表单校验、排序、海报与 TMDB 缓存的回归测试
- Release 工作流改用 `npm ci`，并在发布前强制执行 lint 和 build
- README 移除未实现的卡片大小设置，并明确仅支持桌面端

## [0.8.3] - 2026-06-13

### 修复

- 修正 `minAppVersion` 从 `1.6.0` 升级至 `1.7.2`，`workspace.revealLeaf()` 返回 `Promise<void>` 是 1.7.2 才引入的 API，修复 `obsidianmd/no-unsupported-api` 报错

## [0.8.2] - 2026-06-13

### 修复

- 修正 `minAppVersion` 从 `1.5.0` 升级至 `1.6.0`，`revealLeaf` 实际需要 1.6.0+

## [0.8.1] - 2026-06-13

### 修复

- 修复 `minAppVersion` 声明为 `0.15.0` 但使用了 `revealLeaf`、`openLinkText` 等较新 API 的问题，升级至 `1.5.0`
- 修复多处 Promise 未 await 的警告（`activateCardWall`、`saveData`、`revealLeaf`）
- 修复 async 回调传入期望 void 返回值的参数导致的类型警告
- 修复 `loadData()` 和 `response.json` 的 unsafe `any` 赋值警告
- 修复 `setTimeout`/`clearTimeout` 未使用 `window.` 前缀的 popout 窗口兼容性警告
- ESLint 配置新增 `.opencode/` 忽略规则，消除无关文件误报

## [0.8.0] - 2026-06-13

### 新增

- 海报本地缓存功能，支持将 TMDB 海报下载到本地 `_posters` 目录，避免每次加载都请求远程图片
- 设置面板新增"启用海报缓存"开关
- TMDB API 内存缓存 + data.json 持久化，减少重复 API 请求
- `writingPaths` 机制：插件自身写入文件时跳过 `modify`/`create` 事件监听，避免无限刷新
- 海报加载失败时的 fallback 显示，附带 TMDB 链接

### 修复

- 添加电影记录后海报墙不自动刷新的问题（缺少 `vault.on('create')` 事件监听）
- 本地海报文件不存在时海报墙显示"海报加载失败"的问题
- `resolveLocalPosterUrl` 在文件缺失时返回无效路径导致 `<img>` 加载失败
- `updateYearFileStats` 中无效的递减分支

### 优化

- 卡片墙刷新增加 300ms 防抖，避免频繁渲染
- 年份文件按 mtime 缓存 + 并行读取，大幅提升海报墙加载性能
- `doRefresh` 拆分为 `loadAllRecords` + `renderFilteredView`，数据加载与渲染分离
- `loadAllRecords` 中每个文件包裹 try/catch，单个文件损坏不影响整体
- `refreshCards` 使用 `.catch()` 替代 `void`，异常不再静默丢失
- 新增 `reportError` 工具函数统一错误处理，替代纯 `Notice` 的 catch 块
- 开源协议更换为 MIT
- Node.js 版本升级到 24.x

## [0.7.0] - 2026-06-13

- 海报墙年份筛选功能
- 竖向布局适配（窄面板自动切换）
- 排序功能（按观看日期/标题/评分/上映日期）
- 电影/剧集独立记录文件
- 观看状态追踪（计划/正在/已看完/已弃剧）
- 个人评分与观后感
