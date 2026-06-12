import { App, TFile } from 'obsidian';
import { TMDBMovieDetails, TMDBTVShowDetails, TMDBSeasonDetails, PluginSettings, SubHeadingStyle } from './types';
import { buildPosterUrl } from './tmdb-api';
import { sortMarkdownRecords } from './sort-records';

export interface UserRecordInput {
    year?: string;
    watchDate?: string;
    rating?: string;
    platform?: string;
    status?: string;
}

export function generateMovieRecord(
    movie: TMDBMovieDetails,
    settings: PluginSettings,
    userInput?: UserRecordInput
): string {
    const posterUrl = buildPosterUrl(movie.poster_path, 'original') || '';
    const tmdbLink = `https://www.themoviedb.org/movie/${movie.id}`;
    const genres = movie.genres.map(g => g.name);
    const duration = movie.runtime || 0;
    const today = new Date().toISOString().split('T')[0];
    const watchDate = userInput?.watchDate || today;
    const status = userInput?.status || 'planned';
    const statusText: Record<string, string> = {
        'completed': '已看完',
        'planned': '计划观看',
        'watching': '正在观看',
        'dropped': '已弃剧'
    };

    const h = (title: string) => settings.subHeadingStyle === SubHeadingStyle.BOLD ? `> **${title}**` : `### ${title}`;

    return `## 🎬 ${movie.title}

${h('电影信息')}

![宣传海报|350](${posterUrl})

- **类型**: ${genres.join('、') || '未知'}
- **TMDB ID**: ${movie.id}
- **TMDB链接**: ${tmdbLink}
- **评分**: ★ ${movie.vote_average?.toFixed(1) || '?'}/10（${movie.vote_count || 0}人）
- **片长**: ${duration}分钟
- **上映日期**: ${movie.release_date || '未知'}
- **剧情简介**: ${movie.overview || '暂无简介'}

${h('我的观看记录')}

- **记录日期**: ${today}
- **完成日期**: ${status === 'completed' ? watchDate : ''}
- **我的评分**: ${userInput?.rating || ''}
- **观看平台**: ${userInput?.platform || ''}
- **观看状态**: ${statusText[status] || '已看完'}

${h('观后感')}

（请在此处填写你的观后感）

---

`;
}

export function generateTVRecord(
    show: TMDBTVShowDetails,
    season: TMDBSeasonDetails,
    settings: PluginSettings,
    userInput?: UserRecordInput
): string {
    const posterPath = season.poster_path || show.poster_path;
    const posterUrl = buildPosterUrl(posterPath, 'original') || '';
    const tmdbLink = `https://www.themoviedb.org/tv/${show.id}/season/${season.season_number}`;
    const genres = show.genres.map(g => g.name);
    const year = season.air_date ? season.air_date.substring(0, 4) : '';
    const episodeCount = season.episodes.length;
    const seasonRating = season.episodes.length > 0
        ? (season.episodes.reduce((sum, ep) => sum + (ep.vote_average || 0), 0) / season.episodes.length).toFixed(1)
        : '0.0';
    const today = new Date().toISOString().split('T')[0];
    const watchDate = userInput?.watchDate || today;
    const status = userInput?.status || 'planned';
    const statusText: Record<string, string> = {
        'completed': '已看完',
        'planned': '计划观看',
        'watching': '正在观看',
        'dropped': '已弃剧'
    };

    const h = (title: string) => settings.subHeadingStyle === SubHeadingStyle.BOLD ? `> **${title}**` : `### ${title}`;

    return `## 📺 ${show.name} - ${season.name}

${h('本季信息')}

![宣传海报|350](${posterUrl})

- **类型**: ${genres.join('、') || '未知'}
- **TMDB ID**: ${show.id}
- **TMDB链接**: ${tmdbLink}
- **剧评分**: ★ ${show.vote_average?.toFixed(1) || '?'}/10（${show.vote_count || 0}人）
- **季评分**: ★ ${seasonRating}/10
- **季名**: ${season.name}
- **集数**: ${episodeCount}集
- **播出年份**: ${year || '未知'}
- **本季简介**: ${season.overview || show.overview || '暂无简介'}

${h('我的观看记录')}

- **记录日期**: ${today}
- **完成日期**: ${status === 'completed' ? watchDate : ''}
- **观看进度**: ${status === 'completed' ? episodeCount : 0}/${episodeCount}集
- **我的评分**: ${userInput?.rating || ''}
- **观看平台**: ${userInput?.platform || ''}
- **观看状态**: ${statusText[status] || '已看完'}

${h('本季观感')}

（请在此处填写你的观后感）

---

`;
}

export async function appendToYearFile(
    app: App,
    content: string,
    folder: string,
    watchDate: string | null,
    contentType: 'movie' | 'tv',
    writingPaths: Set<string>
): Promise<TFile> {
    const folderPath = folder.replace(/^\/|\/$/g, '');
    const year = watchDate ? watchDate.substring(0, 4) : new Date().getFullYear().toString();
    const filePath = `${folderPath}/${year}.md`;

    await app.vault.createFolder(folderPath).catch(() => {});

    let file = app.vault.getAbstractFileByPath(filePath);
    if (!file) {
        const initialContent = `---
year: ${year}
total_movies: ${contentType === 'movie' ? 1 : 0}
total_tv_shows: ${contentType === 'tv' ? 1 : 0}
---

# ${year}年观影记录

${content}
`;
        const created = await app.vault.create(filePath, initialContent);
        return created;
    }

    if (!(file instanceof TFile)) {
        throw new Error(`路径不是文件: ${filePath}`);
    }

    const existingContent = await app.vault.read(file);
    const isMovie = contentType === 'movie';
    const updatedContent = updateYearFileStats(existingContent, isMovie, 'increment');

    const insertAfter = `# ${year}年观影记录\n\n`;
    const insertIndex = updatedContent.indexOf(insertAfter);
    let newContent: string;
    if (insertIndex !== -1) {
        const afterHeader = insertIndex + insertAfter.length;
        newContent = updatedContent.substring(0, afterHeader) + content + '\n\n' + updatedContent.substring(afterHeader);
    } else {
        newContent = updatedContent + '\n\n' + content;
    }

    const sortedContent = sortMarkdownRecords(newContent);

    try {
        writingPaths.add(file.path);
        await app.vault.modify(file, sortedContent);
    } finally {
        writingPaths.delete(file.path);
    }
    return file;
}

function updateYearFileStats(content: string, isMovie: boolean, action: 'increment' | 'decrement'): string {
    const field = isMovie ? 'total_movies' : 'total_tv_shows';
    const regex = new RegExp(`(${field}:\\s*)(\\d+)`);
    const match = content.match(regex);
    if (match && match[2] !== undefined) {
        const current = parseInt(match[2], 10);
        const newCount = action === 'increment' ? current + 1 : Math.max(0, current - 1);
        return content.replace(regex, `$1${newCount}`);
    }
    return content;
}

export async function createRecordFile(
    app: App,
    content: string,
    folder: string,
    fileName: string,
    watchDate?: string | null,
    contentType?: 'movie' | 'tv',
    writingPaths?: Set<string>
): Promise<TFile> {
    if (watchDate !== undefined && contentType) {
        return appendToYearFile(app, content, folder, watchDate, contentType, writingPaths ?? new Set());
    }

    const folderPath = folder.replace(/^\/|\/$/g, '');

    const existingFile = app.vault.getAbstractFileByPath(`${folderPath}/${fileName}.md`);
    let finalName = fileName;
    if (existingFile) {
        let suffix = 2;
        while (app.vault.getAbstractFileByPath(`${folderPath}/${finalName}-${suffix}.md`)) {
            suffix++;
        }
        finalName = `${fileName}-${suffix}`;
    }

    const filePath = `${folderPath}/${finalName}.md`;

    try {
        await app.vault.createFolder(folderPath).catch(() => {});
        return await app.vault.create(filePath, content);
    } catch (error) {
        throw new Error(`创建文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}

export function generateMovieFileName(movie: TMDBMovieDetails): string {
    const year = movie.release_date ? movie.release_date.substring(0, 4) : '';
    return year ? `${movie.title} (${year})` : movie.title;
}

export function generateTVFileName(show: TMDBTVShowDetails, seasonNumber: number): string {
    const season = show.seasons.find(s => s.season_number === seasonNumber);
    const year = season?.air_date ? season.air_date.substring(0, 4) : '';
    return year ? `${show.name} - S${seasonNumber} (${year})` : `${show.name} - S${seasonNumber}`;
}
