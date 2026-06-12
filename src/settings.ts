import { App, PluginSettingTab, Setting } from 'obsidian';
import MovieLogPlugin from './main';
import { SortBy, SubHeadingStyle } from './types';

export class MovieLogSettingTab extends PluginSettingTab {
    plugin: MovieLogPlugin;

    constructor(app: App, plugin: MovieLogPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName('设置').setHeading();

        new Setting(containerEl)
            .setName('TMDB API key')
            .setDesc('在 themoviedb.org 注册获取免费 API key')
            .addText(text => {
                text
                    .setPlaceholder('输入你的 TMDB API key')
                    .setValue(this.plugin.settings.tmdbApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.tmdbApiKey = value.trim();
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
            })
            .addExtraButton(btn => {
                btn
                    .setIcon('eye')
                    .setTooltip('显示/隐藏 API key')
                    .onClick(() => {
                        const inputEl = btn.extraSettingsEl
                            .closest('.setting-item')
                            ?.querySelector('input') as HTMLInputElement;
                        if (inputEl) {
                            const isHidden = inputEl.type === 'password';
                            inputEl.type = isHidden ? 'text' : 'password';
                            btn.setIcon(isHidden ? 'eye-off' : 'eye');
                        }
                    });
            });

        new Setting(containerEl)
            .setName('默认保存文件夹')
            .setDesc('新记录保存到的文件夹路径')
            .addText(text => text
                .setPlaceholder('MovieLog')
                .setValue(this.plugin.settings.defaultSaveFolder)
                .onChange(async (value) => {
                    this.plugin.settings.defaultSaveFolder = value.trim() || 'MovieLog';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('TMDB 语言')
            .setDesc('从 TMDB 获取元数据的语言')
            .addDropdown(dropdown => dropdown
                .addOption('zh-CN', '简体中文')
                .addOption('zh-TW', '繁體中文')
                .addOption('en-US', 'English')
                .addOption('ja-JP', '日本語')
                .addOption('ko-KR', '한국어')
                .setValue(this.plugin.settings.tmdbLanguage)
                .onChange(async (value) => {
                    this.plugin.settings.tmdbLanguage = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('排序方式')
            .setDesc('卡片墙中的默认排序方式')
            .addDropdown(dropdown => dropdown
                .addOption(SortBy.WATCH_DATE, '观看日期')
                .addOption(SortBy.TITLE, '标题')
                .addOption(SortBy.RATING, '评分')
                .addOption(SortBy.RELEASE_DATE, '上映日期')
                .setValue(this.plugin.settings.sortBy)
                .onChange(async (value) => {
                    this.plugin.settings.sortBy = value as SortBy;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('子标题样式')
            .setDesc('记录中各区块标题的显示格式')
            .addDropdown(dropdown => dropdown
                .addOption(SubHeadingStyle.BOLD, '> **引用加粗格式**')
                .addOption(SubHeadingStyle.HEADING, '### 标题格式')
                .setValue(this.plugin.settings.subHeadingStyle)
                .onChange(async (value) => {
                    this.plugin.settings.subHeadingStyle = value as SubHeadingStyle;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('海报本地缓存')
            .setDesc('启用后将海报图片下载到本地，离线也能查看。默认关闭。')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.posterCacheEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.posterCacheEnabled = value;
                    await this.plugin.saveSettings();
                }));
    }
}
