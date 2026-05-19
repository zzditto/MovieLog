export interface MovieRecord {
    title: string;
    tmdb_id: number;
    type: 'movie';
    poster: string;
    genres: string[];
    tmdb_rating: number;
    release_date: string;
    tmdb_link: string;
    duration: number;
    watch_status: WatchStatus;
    personal_rating: number | null;
    watch_date: string | null;
    watch_platform: string | null;
    review: string | null;
}

export interface TVShowRecord {
    title: string;
    tmdb_id: number;
    type: 'tv';
    season_number: number;
    season_name: string;
    poster: string;
    genres: string[];
    show_rating: number;
    season_rating: number | null;
    episode_count: number;
    episodes: Episode[];
    tmdb_link: string;
    duration: number;
    watch_status: WatchStatus;
    personal_rating: number | null;
    watch_progress: string;
    watch_date: string | null;
    watch_platform: string | null;
    review: string | null;
}

export interface Episode {
    episode_number: number;
    name: string;
    air_date: string | null;
}

export interface PluginSettings {
    tmdbApiKey: string;
    tmdbLanguage: string;
    defaultSaveFolder: string;
    sortBy: SortBy;
}

export enum WatchStatus {
    PLANNED = 'planned',
    WATCHING = 'watching',
    COMPLETED = 'completed',
    DROPPED = 'dropped'
}

export enum SortBy {
    WATCH_DATE = 'watch_date',
    TITLE = 'title',
    RATING = 'rating',
    RELEASE_DATE = 'release_date'
}

export interface TMDBSearchResult {
    id: number;
    media_type: 'movie' | 'tv';
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    poster_path: string | null;
    overview: string;
    original_language: string;
}

export interface TMDBMovieDetails {
    id: number;
    title: string;
    genres: { id: number; name: string }[];
    vote_average: number;
    vote_count: number;
    runtime: number | null;
    release_date: string;
    poster_path: string | null;
    overview: string;
    duration?: number;
}

export interface TMDBTVShowDetails {
    id: number;
    name: string;
    genres: { id: number; name: string }[];
    vote_average: number;
    vote_count: number;
    number_of_seasons: number;
    seasons: TMDBSeason[];
    overview: string;
    poster_path: string | null;
}

export interface TMDBSeason {
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
    vote_average: number | null;
}

export interface TMDBSeasonDetails {
    season_number: number;
    name: string;
    episodes: TMDBEpisode[];
    overview: string;
    poster_path: string | null;
    air_date: string | null;
}

export interface TMDBEpisode {
    episode_number: number;
    name: string;
    air_date: string | null;
    vote_average?: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    tmdbApiKey: '',
    tmdbLanguage: 'zh-CN',
    defaultSaveFolder: 'MovieLog',
    sortBy: SortBy.WATCH_DATE
};
