# MovieLog

一个 Obsidian 插件，用于记录你的电影和电视剧观影历史。通过 TMDB API 获取影视剧信息，生成结构化的观影记录，并以卡片墙形式展示。

## 功能特性

- **TMDB 搜索**：通过命令面板搜索电影和电视剧，自动获取元数据
- **模板化记录**：自动生成包含海报、评分、简介等信息的 Markdown 文件
- **剧集支持**：支持按季记录电视剧，包含集数列表和观看进度
- **卡片墙视图**：以可视化卡片网格浏览所有观影记录
- **个人字段**：可填写观后感、个人评分、观看平台、观看状态等

## 预览

![预览](image.png)

## 安装

### 方法 1：从 Obsidian 插件市场安装（推荐）

1. 打开 Obsidian → 设置 → 第三方插件 → 浏览
2. 搜索 "MovieLog"
3. 点击安装并启用

### 方法 2：手动安装

1. 从 [Releases](https://github.com/YOUR_USERNAME/movielog/releases) 下载最新版本的 `main.js`、`manifest.json`、`styles.css`
2. 在你的 Obsidian 库中创建插件目录：
   ```
   {你的库}/.obsidian/plugins/movielog/
   ```
3. 将下载的三个文件复制到该目录
4. 打开 Obsidian → 设置 → 第三方插件 → 启用 MovieLog

### 方法 3：从源码构建

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/movielog.git
cd movielog

# 安装依赖
npm install

# 构建
npm run build

# 复制到你的 Obsidian 库
cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/movielog/
```

## 配置

1. 打开 Obsidian → 设置 → 第三方插件 → MovieLog
2. 输入你的 TMDB API Key：
   - 前往 [themoviedb.org](https://www.themoviedb.org/signup) 注册账号
   - 在 [API 设置](https://www.themoviedb.org/settings/api) 获取 API Key
3. 配置其他选项：
   - **默认保存文件夹**：观影记录保存的目录（默认：`MovieLog`）
   - **TMDB 语言**：元数据语言（默认：简体中文）
   - **卡片大小**：卡片墙中卡片的显示大小
   - **排序方式**：按观看日期、标题、评分或上映日期排序

## 使用方法

### 添加电影记录

1. 按 `Ctrl+P`（macOS 为 `Cmd+P`）打开命令面板
2. 输入 `MovieLog: 添加电影记录`
3. 输入电影名称并搜索
4. 从结果列表中选择电影
5. 自动生成包含完整信息的 Markdown 文件
6. 填写你的观后感、评分等个人字段

### 添加剧集记录

1. 打开命令面板，输入 `MovieLog: 添加剧集记录`
2. 搜索电视剧名称
3. 选择剧集后，选择要记录的季
4. 自动生成包含剧集信息和集数列表的文件
5. 更新观看进度和观后感

### 查看卡片墙

1. 点击左侧边栏的电影图标
2. 或使用命令面板输入 `MovieLog: 打开卡片墙`
3. 浏览所有观影记录，点击卡片跳转到对应文件

## 许可证

MIT License
