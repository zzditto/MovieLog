import { App, Modal } from 'obsidian';
import { TMDBTVShowDetails } from './types';

export class SeasonModal extends Modal {
    private show: TMDBTVShowDetails;
    private onSelect: (seasonNumber: number) => void;

    constructor(app: App, show: TMDBTVShowDetails, onSelect: (seasonNumber: number) => void) {
        super(app);
        this.show = show;
        this.onSelect = onSelect;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: `${this.show.name} - 选择季` });

        const seasons = this.show.seasons.filter(s => s.season_number > 0);

        if (seasons.length === 0) {
            contentEl.createEl('p', { text: '该剧暂无季信息。' });
            return;
        }

        const list = contentEl.createDiv({ cls: 'movielog-season-list' });

        for (const season of seasons) {
            const item = list.createDiv({ cls: 'movielog-season-item' });

            const info = item.createDiv({ cls: 'movielog-season-info' });
            info.createEl('strong', { text: `第${season.season_number}季: ${season.name}` });
            info.createEl('span', { text: `${season.episode_count}集` });
            if (season.vote_average) {
                info.createEl('span', { text: `⭐ ${season.vote_average.toFixed(1)}` });
            }
            if (season.air_date) {
                info.createEl('span', { text: season.air_date.substring(0, 4) });
            }

            item.addEventListener('click', () => {
                this.close();
                this.onSelect(season.season_number);
            });
        }
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
