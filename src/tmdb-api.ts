import { requestUrl } from 'obsidian';
import {
    TMDBSearchResult,
    TMDBMovieDetails,
    TMDBTVShowDetails,
    TMDBSeasonDetails
} from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const TTL = 24 * 60 * 60 * 1000;
const PERSIST_DEBOUNCE_MS = 500;

export interface TmdbCacheEntry {
    data: unknown;
    timestamp: number;
}

const memoryCache = new Map<string, TmdbCacheEntry>();

let persistCallback: (() => void) | null = null;
let persistTimer: number | null = null;

export function initTmdbCache(data: Record<string, TmdbCacheEntry>): void {
    for (const [key, entry] of Object.entries(data)) {
        memoryCache.set(key, entry);
    }
}

export function getTmdbCacheForPersist(): Record<string, TmdbCacheEntry> {
    const result: Record<string, TmdbCacheEntry> = {};
    for (const [key, entry] of memoryCache) {
        result[key] = entry;
    }
    return result;
}

export function setTmdbCachePersistCallback(cb: () => void): void {
    persistCallback = cb;
}

function schedulePersist(): void {
    if (!persistCallback) return;
    if (persistTimer !== null) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
        persistTimer = null;
        persistCallback!();
    }, PERSIST_DEBOUNCE_MS);
}

function getCached<T>(key: string): T | null {
    const entry = memoryCache.get(key);
    if (entry && Date.now() - entry.timestamp < TTL) {
        return entry.data as T;
    }
    memoryCache.delete(key);
    return null;
}

function setCache(key: string, data: unknown): void {
    memoryCache.set(key, { data, timestamp: Date.now() });
    schedulePersist();
}

export async function searchMulti(
    query: string,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBSearchResult[]> {
    const cacheKey = `search:${query.trim()}:${language}`;
    const cached = getCached<TMDBSearchResult[]>(cacheKey);
    if (cached) return cached;

    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodedQuery}&language=${language}&include_adult=false&page=1`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB search failed: ${response.status}`);
    }

    const data = response.json as { results?: TMDBSearchResult[] };
    const results = (data.results || []).filter(
        (item: TMDBSearchResult) => item.media_type === 'movie' || item.media_type === 'tv'
    );

    setCache(cacheKey, results);
    return results;
}

export async function getMovieDetails(
    movieId: number,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBMovieDetails> {
    const cacheKey = `movie:${movieId}:${language}`;
    const cached = getCached<TMDBMovieDetails>(cacheKey);
    if (cached) return cached;

    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=${language}`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB movie details failed: ${response.status}`);
    }

    const result = response.json as TMDBMovieDetails;
    setCache(cacheKey, result);
    return result;
}

export async function getTVShowDetails(
    tvId: number,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBTVShowDetails> {
    const cacheKey = `tv:${tvId}:${language}`;
    const cached = getCached<TMDBTVShowDetails>(cacheKey);
    if (cached) return cached;

    const url = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=${language}`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB TV show details failed: ${response.status}`);
    }

    const result = response.json as TMDBTVShowDetails;
    setCache(cacheKey, result);
    return result;
}

export async function getSeasonDetails(
    tvId: number,
    seasonNumber: number,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBSeasonDetails> {
    const cacheKey = `season:${tvId}:${seasonNumber}:${language}`;
    const cached = getCached<TMDBSeasonDetails>(cacheKey);
    if (cached) return cached;

    const url = `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=${language}`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB season details failed: ${response.status}`);
    }

    const result = response.json as TMDBSeasonDetails;
    setCache(cacheKey, result);
    return result;
}

export function buildPosterUrl(posterPath: string | null, size: string = 'w342'): string | null {
    if (!posterPath) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`;
}

export function getYear(item: TMDBSearchResult): string {
    const dateStr = item.release_date || item.first_air_date;
    return dateStr ? dateStr.substring(0, 4) : '未知';
}
