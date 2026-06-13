# Changelog

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
