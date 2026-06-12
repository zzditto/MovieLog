import { App, Modal, Notice, Plugin, Setting, TFile } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from './types';
import { MovieLogSettingTab } from './settings';
import { SearchModal } from './search-modal';
import { getMovieDetails, getTVShowDetails, getSeasonDetails } from './tmdb-api';
import {
    generateMovieRecord,
    generateTVRecord,
    createRecordFile,
    generateMovieFileName,
    generateTVFileName,
    UserRecordInput
} from './record-generator';
import { MovieLogView, VIEW_TYPE_MOVIELOG } from './card-wall-view';

class AddRecordModal extends Modal {
    private result: UserRecordInput;
    private onSubmit: (result: UserRecordInput) => void;

    constructor(app: App, onSubmit: (result: UserRecordInput) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.result = {
            year: new Date().getFullYear().toString(),
            watchDate: new Date().toISOString().split('T')[0],
            rating: '',
            platform: '',
            status: 'completed'
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '添加观影记录' });

        new Setting(contentEl)
            .setName('年份')
            .setDesc('观影年份（如：2024）')
            .addText(text => text
                .setValue(this.result.year || '')
                .onChange(value => this.result.year = value));

        new Setting(contentEl)
            .setName('观看日期')
            .setDesc('观看日期（YYYY-MM-DD）')
            .addText(text => text
                .setValue(this.result.watchDate || '')
                .onChange(value => this.result.watchDate = value));

        new Setting(contentEl)
            .setName('我的评分')
            .setDesc('评分（0-10）')
            .addText(text => text
                .setValue(this.result.rating || '')
                .onChange(value => this.result.rating = value));

        new Setting(contentEl)
            .setName('观看平台')
            .setDesc('观看平台（如：Netflix、爱奇艺）')
            .addText(text => text
                .setValue(this.result.platform || '')
                .onChange(value => this.result.platform = value));

        new Setting(contentEl)
            .setName('观看状态')
            .setDesc('当前观看状态')
            .addDropdown(dropdown => dropdown
                .addOption('planned', '计划观看')
                .addOption('watching', '正在观看')
                .addOption('completed', '已看完')
                .addOption('dropped', '已弃剧')
                .setValue(this.result.status || 'planned')
                .onChange(value => this.result.status = value));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('确认添加')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(this.result);
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class MovieLogPlugin extends Plugin {
    settings: PluginSettings;
    private writingPaths = new Set<string>();

    async onload() {
        await this.loadSettings();

        this.registerView(VIEW_TYPE_MOVIELOG, (leaf) => new MovieLogView(leaf, this.settings));

        this.addRibbonIcon('film', 'MovieLog', () => {
            this.activateCardWall();
        });

        this.addSettingTab(new MovieLogSettingTab(this.app, this));

        this.addCommand({
            id: 'open-wall',
            name: '打开卡片墙',
            callback: () => {
                this.activateCardWall();
            }
        });

        this.addCommand({
            id: 'add-movie',
            name: '添加电影记录',
            callback: () => {
                if (!this.settings.tmdbApiKey) {
                    new Notice('请先在 MovieLog 设置中配置 TMDB API Key');
                    return;
                }
                new SearchModal(this.app, this.settings.tmdbApiKey, this.settings.tmdbLanguage, 'movie', async (result) => {
                    try {
                        new Notice('正在获取电影详情...');
                        const details = await getMovieDetails(result.id, this.settings.tmdbApiKey, this.settings.tmdbLanguage);
                        new AddRecordModal(this.app, async (userInput) => {
                            try {
                                const content = generateMovieRecord(details, this.settings, userInput);
                                const fileName = generateMovieFileName(details);
                                const file = await createRecordFile(this.app, content, this.settings.defaultSaveFolder, fileName, userInput.watchDate || null, 'movie', this.writingPaths);
                                await this.app.workspace.openLinkText(file.path, '', true);
                                new Notice(`已创建: ${file.basename}`);
                            } catch (error) {
                                new Notice(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
                            }
                        }).open();
                    } catch (error) {
                        new Notice(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
                    }
                }).open();
            }
        });

        this.addCommand({
            id: 'add-tv',
            name: '添加剧集记录',
            callback: () => {
                if (!this.settings.tmdbApiKey) {
                    new Notice('请先在 MovieLog 设置中配置 TMDB API Key');
                    return;
                }
                new SearchModal(this.app, this.settings.tmdbApiKey, this.settings.tmdbLanguage, 'tv', async (result) => {
                    try {
                        new Notice('正在获取剧集详情...');
                        const showDetails = await getTVShowDetails(result.id, this.settings.tmdbApiKey, this.settings.tmdbLanguage);
                        const { SeasonModal } = await import('./season-modal');
                        new SeasonModal(this.app, showDetails, async (seasonNumber) => {
                            try {
                                new Notice('正在获取季详情...');
                                const seasonDetails = await getSeasonDetails(showDetails.id, seasonNumber, this.settings.tmdbApiKey, this.settings.tmdbLanguage);
                                new AddRecordModal(this.app, async (userInput) => {
                                    try {
                                        const content = generateTVRecord(showDetails, seasonDetails, this.settings, userInput);
                                        const fileName = generateTVFileName(showDetails, seasonNumber);
                                        const file = await createRecordFile(this.app, content, this.settings.defaultSaveFolder, fileName, userInput.watchDate || null, 'tv', this.writingPaths);
                                        await this.app.workspace.openLinkText(file.path, '', true);
                                        new Notice(`已创建: ${file.basename}`);
                                    } catch (error) {
                                        new Notice(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
                                    }
                                }).open();
                            } catch (error) {
                                new Notice(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
                            }
                        }).open();
                    } catch (error) {
                        new Notice(`获取剧集详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
                    }
                }).open();
            }
        });
        this.app.workspace.onLayoutReady(() => {
            this.registerEvent(
                this.app.vault.on('modify', (file) => {
                    if (file instanceof TFile && file.extension === 'md') {
                        if (this.writingPaths.has(file.path)) return;
                        const saveFolder = this.settings.defaultSaveFolder.replace(/^\/|\/$/g, '');
                        if (file.path.startsWith(saveFolder + '/')) {
                            this.refreshCardWall();
                        }
                    }
                })
            );
        });
    }

    refreshCardWall(): void {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MOVIELOG);
        for (const leaf of leaves) {
            const view = leaf.view as MovieLogView;
            if (view) {
                view.refreshCards();
            }
        }
    }

    private async activateCardWall(): Promise<void> {
        const { workspace } = this.app;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_MOVIELOG);

        if (leaves.length > 0) {
            const leaf = leaves[0]!;
            const activeView = workspace.getActiveViewOfType(MovieLogView);
            if (activeView && activeView.leaf === leaf) {
                leaf.detach();
                return;
            }
            workspace.revealLeaf(leaf);
            return;
        }

        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: VIEW_TYPE_MOVIELOG, active: true });
            workspace.revealLeaf(leaf);
        }
    }

    onunload() {
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.refreshCardWall();
    }
}
