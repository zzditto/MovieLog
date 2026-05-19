import { requestUrl } from 'obsidian';
import {
    TMDBSearchResult,
    TMDBMovieDetails,
    TMDBTVShowDetails,
    TMDBSeasonDetails
} from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export async function searchMulti(
    query: string,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBSearchResult[]> {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodedQuery}&language=${language}&include_adult=false&page=1`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB search failed: ${response.status}`);
    }

    const data: { results?: TMDBSearchResult[] } = response.json;
    return (data.results || []).filter(
        (item: TMDBSearchResult) => item.media_type === 'movie' || item.media_type === 'tv'
    );
}

export async function getMovieDetails(
    movieId: number,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBMovieDetails> {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=${language}`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB movie details failed: ${response.status}`);
    }

    return response.json as TMDBMovieDetails;
}

export async function getTVShowDetails(
    tvId: number,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBTVShowDetails> {
    const url = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=${language}`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB TV show details failed: ${response.status}`);
    }

    return response.json as TMDBTVShowDetails;
}

export async function getSeasonDetails(
    tvId: number,
    seasonNumber: number,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBSeasonDetails> {
    const url = `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=${language}`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB season details failed: ${response.status}`);
    }

    return response.json as TMDBSeasonDetails;
}

export function buildPosterUrl(posterPath: string | null, size: string = 'w342'): string | null {
    if (!posterPath) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`;
}

export function getYear(item: TMDBSearchResult): string {
    const dateStr = item.release_date || item.first_air_date;
    return dateStr ? dateStr.substring(0, 4) : '未知';
}
