import { requestUrl } from 'obsidian';
import {
    TMDBSearchResult,
    TMDBMovieDetails,
    TMDBTVShowDetails,
    TMDBSeasonDetails
} from './types';
import { pruneTmdbCacheEntries, TmdbCacheEntry } from './tmdb-cache';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const PERSIST_DEBOUNCE_MS = 500;
export type { TmdbCacheEntry } from './tmdb-cache';

const memoryCache = new Map<string, TmdbCacheEntry>();

let persistCallback: (() => void) | null = null;
let persistTimer: number | null = null;

export function initTmdbCache(data: Record<string, TmdbCacheEntry>): void {
	replaceMemoryCache(pruneTmdbCacheEntries(data));
}

export function getTmdbCacheForPersist(): Record<string, TmdbCacheEntry> {
	const entries: Record<string, unknown> = Object.fromEntries(memoryCache);
	const result = pruneTmdbCacheEntries(entries);
	replaceMemoryCache(result);
	return result;
}

function replaceMemoryCache(entries: Record<string, TmdbCacheEntry>): void {
	memoryCache.clear();
	for (const key of Object.keys(entries)) {
		memoryCache.set(key, entries[key]!);
	}
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
	const validEntry = entry ? pruneTmdbCacheEntries({ key: entry }).key : undefined;
	if (validEntry) {
		return validEntry.data as T;
    }
    memoryCache.delete(key);
    return null;
}

function setCache(key: string, data: unknown): void {
    memoryCache.set(key, { data, timestamp: Date.now() });
    schedulePersist();
}

async function search(
	mediaType: 'movie' | 'tv' | 'multi',
	query: string,
    apiKey: string,
    language: string = 'zh-CN'
): Promise<TMDBSearchResult[]> {
	const cacheKey = `search:${mediaType}:${query.trim()}:${language}`;
    const cached = getCached<TMDBSearchResult[]>(cacheKey);
    if (cached) return cached;

    const encodedQuery = encodeURIComponent(query.trim());
	const url = `${TMDB_BASE_URL}/search/${mediaType}?api_key=${apiKey}&query=${encodedQuery}&language=${language}&include_adult=false&page=1`;

    const response = await requestUrl({ url });
    if (response.status !== 200) {
        throw new Error(`TMDB search failed: ${response.status}`);
    }

	const data = response.json as { results?: TMDBSearchResult[] };
	const results = (data.results || [])
		.filter(item => mediaType !== 'multi' || item.media_type === 'movie' || item.media_type === 'tv')
		.map((item: TMDBSearchResult) => ({
		...item,
		media_type: mediaType === 'multi' ? item.media_type : mediaType
	}));

    setCache(cacheKey, results);
    return results;
}

export function searchMulti(query: string, apiKey: string, language: string = 'zh-CN'): Promise<TMDBSearchResult[]> {
	return search('multi', query, apiKey, language);
}

export function searchMovie(query: string, apiKey: string, language: string = 'zh-CN'): Promise<TMDBSearchResult[]> {
	return search('movie', query, apiKey, language);
}

export function searchTV(query: string, apiKey: string, language: string = 'zh-CN'): Promise<TMDBSearchResult[]> {
	return search('tv', query, apiKey, language);
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
