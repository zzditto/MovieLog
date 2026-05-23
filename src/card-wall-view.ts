import { ItemView, WorkspaceLeaf } from 'obsidian';
import { PluginSettings, SortBy } from './types';

export const VIEW_TYPE_MOVIELOG = 'movielog-wall';

interface ParsedRecord {
    type: 'movie' | 'tv';
    title: string;
    tmdb_id: number;
    poster: string;
    genres: string[];
    tmdb_rating: number;
    release_date: string;
    tmdb_link: string;
    duration: number;
    season_number?: number;
    season_name?: string;
    episode_count?: number;
    watch_date: string | null;
    watch_status: string;
    personal_rating: number | null;
    year: string;
    overview: string;
    watch_platform: string | null;
    review: string | null;
}

const COLOR_THEMES = ['pink', 'blue', 'green', 'peach'];

export class MovieLogView extends ItemView {
    private settings: PluginSettings;
    private resizeObserver: ResizeObserver | null = null;
    private static readonly BREAKPOINT = 580;

    constructor(leaf: WorkspaceLeaf, settings: PluginSettings) {
        super(leaf);
        this.settings = settings;
    }

    getViewType(): string {
        return VIEW_TYPE_MOVIELOG;
    }

    getDisplayText(): string {
        return 'MovieLog';
    }

    getIcon(): string {
        return 'film';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement | undefined;
        if (!container) return;
        container.empty();

        await this.renderCards(container);
        this.setupResizeObserver(container);
    }

    async onClose(): Promise<void> {
        this.cleanupResizeObserver();
    }

    async refreshCards(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement | undefined;
        if (!container) return;
        container.empty();
        await this.renderCards(container);
    }

    private async renderCards(container: HTMLElement): Promise<void> {
        const records = await this.parseAllYearFiles();

        if (records.length === 0) {
            const emptyState = container.createDiv({ cls: 'movielog-empty-state' });
            emptyState.createEl('p', { text: '还没有观影记录' });
            emptyState.createEl('p', { text: '使用命令面板添加你的第一部电影或剧集！' });
            return;
        }

        this.sortRecords(records);

        const totalMovies = records.filter(r => r.type === 'movie').length;
        const totalTvShows = records.filter(r => r.type === 'tv').length;

        const header = container.createDiv({ cls: 'movielog-poster-header' });
        const yearSet = new Set(records.map(r => r.year).filter(Boolean));
        const yearText = yearSet.size === 1 ? `${[...yearSet][0]}年` : '';
        header.createDiv({ cls: 'movielog-stats-title', text: `观影记录${yearText ? `（${yearText}）` : ''}` });
        header.createDiv({ cls: 'movielog-stats-sub', text: `统计：共 ${records.length} 部作品（电影 ${totalMovies} 部 ｜ 电视剧 ${totalTvShows} 部）` });

        const grid = container.createDiv({ cls: 'movielog-poster-wall' });

        for (let i = 0; i < records.length; i++) {
            const record = records[i]!;
            const colorTheme = COLOR_THEMES[i % COLOR_THEMES.length]!;
            this.renderPosterCard(grid, record, colorTheme);
        }
    }

    private async parseAllYearFiles(): Promise<ParsedRecord[]> {
        const files = this.app.vault.getFiles();
        const records: ParsedRecord[] = [];
        const saveFolder = this.settings.defaultSaveFolder.replace(/^\/|\/$/g, '');

        for (const file of files) {
            if (!file.path.endsWith('.md')) continue;
            if (!file.path.startsWith(saveFolder + '/')) continue;

            const yearMatch = file.basename.match(/^(\d{4})$/);
            if (!yearMatch) continue;

            const year = yearMatch[1] ?? '';
            const content = await this.app.vault.read(file);
            const parsed = this.parseYearFileContent(content, year);
            records.push(...parsed);
        }

        return records;
    }

    private parseYearFileContent(content: string, year: string): ParsedRecord[] {
        const records: ParsedRecord[] = [];
        const recordRegex = /## (.+?)\n\n([\s\S]*?)(?=\n## |$)/g;
        let match;

        while ((match = recordRegex.exec(content)) !== null) {
            const rawTitle = match[1] || '';
            const title = rawTitle.replace(/^[🎬📺]\s*/u, '');
            const block = normalizeSectionHeaders(match[2] || '');

            const infoSectionMatch = block.match(/### (电影信息|本季信息)\n\n([\s\S]*?)(?=\n### |$)/);
            if (!infoSectionMatch) continue;

            const infoTitle = infoSectionMatch[1] || '';
            const infoContent = infoSectionMatch[2] || '';
            const type: 'movie' | 'tv' = infoTitle === '电影信息' ? 'movie' : 'tv';

            const posterMatch = infoContent.match(/!\[宣传海报\|\d+\]\((.*?)\)/);
            const poster = posterMatch ? posterMatch[1] || '' : '';

            const fields: Record<string, string> = {};
            const fieldRegex = /- \*\*(.+?)\*\*:\s*(.+)/g;
            let fieldMatch;
            while ((fieldMatch = fieldRegex.exec(infoContent)) !== null) {
                fields[fieldMatch[1] || ''] = fieldMatch[2] || '';
            }

            const tmdbId = parseInt(fields['TMDB ID'] || '0', 10);
            if (!title || tmdbId === 0) continue;

            const tmdbLink = fields['TMDB链接'] || '';
            const genresStr = fields['类型'] || '';
            const tmdbRatingStr = type === 'movie' ? fields['评分'] : fields['剧评分'];
            const tmdbRating = tmdbRatingStr ? parseFloat(tmdbRatingStr.replace(/[★☆\s]/g, '').split('/')[0] || '0') : 0;
            const releaseDate = type === 'movie' ? (fields['上映日期'] || '') : (fields['播出年份'] || '');
            const duration = type === 'movie' ? parseInt(fields['片长'] || '0', 10) : 0;
            const overview = fields['剧情简介'] || fields['本季简介'] || '';

            const watchSectionMatch = block.match(/### 我的观看记录\n\n([\s\S]*?)(?=\n### |$)/);
            const watchContent = watchSectionMatch ? watchSectionMatch[1] || '' : '';

            const watchFields: Record<string, string> = {};
            const watchFieldRegex = /- \*\*(.+?)\*\*:\s*(.+)/g;
            let watchFieldMatch;
            while ((watchFieldMatch = watchFieldRegex.exec(watchContent)) !== null) {
                watchFields[watchFieldMatch[1] || ''] = watchFieldMatch[2] || '';
            }

            const reviewMatch = block.match(/### (?:观后感|本季观感)\n\n([\s\S]*?)(?=\n---|$)/);

            const record: ParsedRecord = {
                type,
                title: title.replace(/\s*\(.*?\)\s*$/, '').replace(/\s*-\s*第\d+季\s*$/, '').trim(),
                tmdb_id: tmdbId,
                poster,
                genres: genresStr ? genresStr.split('、').map(g => g.trim()).filter(Boolean) : [],
                tmdb_rating: tmdbRating,
                release_date: releaseDate,
                tmdb_link: tmdbLink,
                duration,
                watch_date: watchFields['完成日期'] || null,
                watch_status: watchFields['观看状态'] || '计划观看',
                personal_rating: watchFields['我的评分'] ? parseFloat(watchFields['我的评分']) : null,
                year,
                overview: overview.trim(),
                watch_platform: watchFields['观看平台'] || null,
                review: reviewMatch ? (reviewMatch[1] || '').trim() : null
            };

            if (type === 'tv') {
                const seasonNameMatch = fields['季名'] || '';
                const seasonNumMatch = seasonNameMatch.match(/(\d+)/);
                record.season_number = seasonNumMatch ? parseInt(seasonNumMatch[1] || '0', 10) : 0;
                record.season_name = seasonNameMatch;
                record.episode_count = parseInt(fields['集数'] || '0', 10);
            }

            records.push(record);
        }

        return records;
    }

    private sortRecords(records: ParsedRecord[]): void {
        switch (this.settings.sortBy) {
            case SortBy.TITLE:
                records.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case SortBy.RATING:
                records.sort((a, b) => b.tmdb_rating - a.tmdb_rating);
                break;
            case SortBy.RELEASE_DATE:
                records.sort((a, b) => b.release_date.localeCompare(a.release_date));
                break;
            case SortBy.WATCH_DATE:
            default:
                records.sort((a, b) => (b.watch_date || '').localeCompare(a.watch_date || ''));
                break;
        }
    }

    private renderPosterCard(container: HTMLElement, record: ParsedRecord, colorTheme: string): void {
        const card = container.createDiv({ cls: `movielog-poster-card ${colorTheme}` });

        if (record.poster) {
            const imgContainer = card.createDiv({ cls: 'movielog-poster-card-img' });
            const img = imgContainer.createEl('img');
            img.src = record.poster;
            img.loading = 'lazy';
            img.alt = record.title;
        } else {
            card.createDiv({ cls: 'movielog-poster-card-img', text: '海报' });
        }

        const info = card.createDiv({ cls: 'movielog-poster-card-info' });

        const titleRow = info.createDiv({ cls: 'movielog-poster-card-title-row' });
        titleRow.createDiv({ cls: 'movielog-poster-card-title', text: record.title });
        if (record.tmdb_link) {
            const tmdbBtn = titleRow.createEl('a', { cls: 'movielog-poster-card-tmdb-btn' });
            tmdbBtn.createSpan({ text: 'TMDB' });
            tmdbBtn.href = record.tmdb_link;
            tmdbBtn.target = '_blank';
            tmdbBtn.addEventListener('click', (e) => e.stopPropagation());
        }

        if (record.genres.length > 0) {
            const tags = info.createDiv({ cls: 'movielog-poster-card-tags' });
            for (const genre of record.genres.slice(0, 3)) {
                tags.createSpan({ cls: 'movielog-poster-card-tag', text: genre });
            }
        }

        const metaGrid = info.createDiv({ cls: 'movielog-poster-card-meta-grid' });

        const typeItem = metaGrid.createDiv({ cls: 'movielog-meta-item' });
        typeItem.createSpan({ cls: 'movielog-meta-icon', text: record.type === 'movie' ? '🎬' : '📺' });
        typeItem.createSpan({ cls: 'movielog-meta-value', text: record.type === 'movie' ? '电影' : '电视剧' });

        const dateItem = metaGrid.createDiv({ cls: 'movielog-meta-item' });
        dateItem.createSpan({ cls: 'movielog-meta-icon', text: '📅' });
        dateItem.createSpan({ cls: 'movielog-meta-value', text: record.release_date || '未知' });

        const durationItem = metaGrid.createDiv({ cls: 'movielog-meta-item' });
        durationItem.createSpan({ cls: 'movielog-meta-icon', text: '⏱' });
        const durationText = record.type === 'movie'
            ? `${record.duration}分钟`
            : `${record.episode_count || 0}集`;
        durationItem.createSpan({ cls: 'movielog-meta-value', text: durationText });

        const ratingItem = metaGrid.createDiv({ cls: 'movielog-meta-item' });
        ratingItem.createSpan({ cls: 'movielog-meta-icon', text: '🌐' });
        ratingItem.createSpan({ cls: 'movielog-meta-value', text: `${record.tmdb_rating.toFixed(1)}/10` });

        const overview = record.overview || '暂无简介';
        const truncatedOverview = overview.length > 110 ? overview.substring(0, 110) + '...' : overview;
        info.createDiv({ cls: 'movielog-poster-card-overview', text: truncatedOverview });

        const right = card.createDiv({ cls: 'movielog-poster-card-right' });

        const yearDate = right.createDiv();
        yearDate.createDiv({ cls: 'movielog-poster-card-year', text: record.year || '' });
        if (record.watch_date) {
            const dateObj = new Date(record.watch_date);
            const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const dayName = days[dateObj.getDay()];
            const monthDay = `${dateObj.getMonth() + 1}.${dateObj.getDate()}`;
            yearDate.createDiv({ cls: 'movielog-poster-card-date', text: `${dayName}.${monthDay}` });
        }

        const rating = right.createDiv({ cls: 'movielog-poster-card-rating' });
        const score = record.personal_rating || record.tmdb_rating;
        const stars = this.renderStars(score);
        rating.createDiv({ cls: 'movielog-poster-stars', text: stars });
        const scoreEl = rating.createDiv({ cls: 'movielog-poster-score' });
        scoreEl.createSpan({ cls: 'movielog-score-main', text: score.toFixed(1) });
        scoreEl.createSpan({ cls: 'movielog-score-unit', text: '/10' });
    }

    private renderStars(rating: number): string {
        const fullStars = Math.floor(rating / 2);
        const halfStar = (rating / 2) - fullStars >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
    }

    private setupResizeObserver(container: HTMLElement): void {
        this.cleanupResizeObserver();

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                const isVertical = width < MovieLogView.BREAKPOINT;
                container.classList.toggle('movielog-vertical-layout', isVertical);
            }
        });

        this.resizeObserver.observe(container);
    }

    private cleanupResizeObserver(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}

function normalizeSectionHeaders(block: string): string {
    return block.replace(
        /^(?:> )?\*\*(电影信息|本季信息|我的观看记录|观后感|本季观感)\*\*$/gm,
        '### $1'
    );
}
