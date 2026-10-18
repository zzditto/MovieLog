import { App, Modal } from 'obsidian';
import { TMDBSearchResult } from './types';
import { searchMovie, searchMulti, searchTV, getYear, buildPosterUrl } from './tmdb-api';

export class SearchModal extends Modal {
    private query: string = '';
    private results: TMDBSearchResult[] = [];
    private onSelect: (result: TMDBSearchResult) => void;
    private apiKey: string;
    private language: string;
	private mediaType: 'movie' | 'tv' | 'all';
	private resultContainer: HTMLElement;
	private searchRequestId = 0;

    constructor(
        app: App,
        apiKey: string,
        language: string,
        mediaType: 'movie' | 'tv' | 'all',
        onSelect: (result: TMDBSearchResult) => void
    ) {
        super(app);
        this.apiKey = apiKey;
        this.language = language;
        this.mediaType = mediaType;
        this.onSelect = onSelect;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: '搜索影视剧' });

        const inputContainer = contentEl.createDiv({ cls: 'movielog-search-input' });
        const input = inputContainer.createEl('input', {
            type: 'text',
            placeholder: '输入影视剧名称...',
            cls: 'movielog-search-field'
        });
        input.focus();

        const searchBtn = inputContainer.createEl('button', { text: '搜索', cls: 'movielog-search-btn' });

		const doSearch = async () => {
			this.query = input.value.trim();
			if (!this.query) return;
			const requestId = ++this.searchRequestId;

            this.resultContainer.empty();
            this.resultContainer.createEl('p', { text: '搜索中...', cls: 'movielog-search-status' });

			try {
				const results = this.mediaType === 'movie'
					? await searchMovie(this.query, this.apiKey, this.language)
					: this.mediaType === 'tv'
						? await searchTV(this.query, this.apiKey, this.language)
						: await searchMulti(this.query, this.apiKey, this.language);
				if (requestId !== this.searchRequestId) return;
				this.results = results;
				this.renderResults();
			} catch (error) {
				if (requestId !== this.searchRequestId) return;
                this.resultContainer.empty();
                this.resultContainer.createEl('p', {
                    text: `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`,
                    cls: 'movielog-search-error'
                });
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') void doSearch();
        });
        searchBtn.addEventListener('click', () => void doSearch());

        this.resultContainer = contentEl.createDiv({ cls: 'movielog-search-results' });
    }

    private renderResults(): void {
        this.resultContainer.empty();

        if (this.results.length === 0) {
            this.resultContainer.createEl('p', { text: '未找到结果，请尝试其他关键词。', cls: 'movielog-search-status' });
            return;
        }

        for (const result of this.results) {
            const item = this.resultContainer.createDiv({ cls: 'movielog-search-item' });

            const posterUrl = buildPosterUrl(result.poster_path, 'w92');
            if (posterUrl) {
                const img = item.createEl('img', { cls: 'movielog-search-poster' });
                img.src = posterUrl;
                img.loading = 'lazy';
            }

            const info = item.createDiv({ cls: 'movielog-search-info' });
            const typeIcon = result.media_type === 'movie' ? '🎬' : '📺';
            const year = getYear(result);
            info.createEl('strong', { text: `${typeIcon} ${result.title || result.name} (${year})` });
            info.createSpan({ text: `⭐ ${(result.vote_average || 0).toFixed(1)}/10` });

            item.addEventListener('click', () => {
                this.close();
                this.onSelect(result);
            });
        }
    }

	onClose(): void {
		this.searchRequestId++;
		const { contentEl } = this;
        contentEl.empty();
    }
}
