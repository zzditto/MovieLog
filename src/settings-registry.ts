import { PluginSettings, SortBy, SubHeadingStyle } from './types';

export type SettingsKey = keyof PluginSettings;

/** 取值是普通 `string` 的设置项（不含枚举型设置项）。 */
type PlainStringSettingKey = {
	[K in SettingsKey]: string extends PluginSettings[K] ? K : never
}[SettingsKey];

type BooleanSettingKey = {
	[K in SettingsKey]: PluginSettings[K] extends boolean ? K : never
}[SettingsKey];

/** 下拉控件的一个选项：存储值与界面文案。 */
export interface SettingOption<V extends string = string> {
	readonly value: V;
	readonly label: string;
}

interface SettingDescriptorBase {
	readonly key: SettingsKey;
	readonly name: string;
	readonly desc: string;
	readonly aliases: readonly string[];
	/** 读取设置对象中该设置项的当前值。 */
	read(settings: PluginSettings): unknown;
	/** 写入成功返回 true；未知取值或类型不符时返回 false 且不修改设置。 */
	write(settings: PluginSettings, raw: unknown): boolean;
}

export interface TextSettingDescriptor<K extends SettingsKey = SettingsKey> extends SettingDescriptorBase {
	readonly key: K;
	readonly control: 'text';
	readonly placeholder?: string;
	readonly normalise: (raw: string) => PluginSettings[K];
}

export interface ApiKeySettingDescriptor<K extends SettingsKey = SettingsKey> extends SettingDescriptorBase {
	readonly key: K;
	readonly control: 'api-key';
	readonly placeholder?: string;
	readonly normalise: (raw: string) => PluginSettings[K];
}

export interface DropdownSettingDescriptor<
	K extends SettingsKey = SettingsKey,
	V extends string = string
> extends SettingDescriptorBase {
	readonly key: K;
	readonly control: 'dropdown';
	readonly options: readonly SettingOption<V>[];
}

export interface ToggleSettingDescriptor<K extends SettingsKey = SettingsKey> extends SettingDescriptorBase {
	readonly key: K;
	readonly control: 'toggle';
}

export type SettingDescriptor =
	| TextSettingDescriptor
	| ApiKeySettingDescriptor
	| DropdownSettingDescriptor
	| ToggleSettingDescriptor;

interface TextLikeConfig<K extends SettingsKey> {
	readonly key: K;
	readonly name: string;
	readonly desc: string;
	readonly aliases?: readonly string[];
	readonly placeholder?: string;
	readonly normalise: (raw: string) => PluginSettings[K];
}

function createTextSetting(
	control: 'text' | 'api-key',
	config: TextLikeConfig<PlainStringSettingKey>
): TextSettingDescriptor | ApiKeySettingDescriptor {
	const { key, normalise } = config;
	return {
		key,
		name: config.name,
		desc: config.desc,
		aliases: config.aliases ?? [],
		control,
		placeholder: config.placeholder,
		normalise,
		read(settings) {
			return settings[key];
		},
		write(settings, raw) {
			if (typeof raw !== 'string') return false;
			settings[key] = normalise(raw);
			return true;
		}
	};
}

function textSetting(config: TextLikeConfig<PlainStringSettingKey>): TextSettingDescriptor {
	return createTextSetting('text', config) as TextSettingDescriptor;
}

function apiKeySetting(config: TextLikeConfig<PlainStringSettingKey>): ApiKeySettingDescriptor {
	return createTextSetting('api-key', config) as ApiKeySettingDescriptor;
}

function dropdownSetting<K extends SettingsKey, V extends PluginSettings[K] & string>(config: {
	readonly key: K;
	readonly name: string;
	readonly desc: string;
	readonly aliases?: readonly string[];
	readonly options: readonly SettingOption<V>[];
}): DropdownSettingDescriptor<K, V> {
	const { key, options } = config;
	return {
		key,
		name: config.name,
		desc: config.desc,
		aliases: config.aliases ?? [],
		control: 'dropdown',
		options,
		read(settings) {
			return settings[key];
		},
		write(settings, raw) {
			if (typeof raw !== 'string') return false;
			const option = options.find(candidate => candidate.value === raw);
			if (!option) return false;
			settings[key] = option.value;
			return true;
		}
	};
}

function toggleSetting(config: {
	readonly key: BooleanSettingKey;
	readonly name: string;
	readonly desc: string;
	readonly aliases?: readonly string[];
}): ToggleSettingDescriptor {
	const { key } = config;
	return {
		key,
		name: config.name,
		desc: config.desc,
		aliases: config.aliases ?? [],
		control: 'toggle',
		read(settings) {
			return settings[key];
		},
		write(settings, raw) {
			if (typeof raw !== 'boolean') return false;
			settings[key] = raw;
			return true;
		}
	};
}

export const TMDB_LANGUAGE_OPTIONS: readonly SettingOption[] = [
	{ value: 'zh-CN', label: '简体中文' },
	{ value: 'zh-TW', label: '繁體中文' },
	{ value: 'en-US', label: 'English' },
	{ value: 'ja-JP', label: '日本語' },
	{ value: 'ko-KR', label: '한국어' }
];

export const SORT_BY_OPTIONS: readonly SettingOption<SortBy>[] = [
	{ value: SortBy.WATCH_DATE, label: '观看日期' },
	{ value: SortBy.TITLE, label: '标题' },
	{ value: SortBy.RATING, label: '评分' },
	{ value: SortBy.RELEASE_DATE, label: '上映日期' }
];

export const SUB_HEADING_STYLE_OPTIONS: readonly SettingOption<SubHeadingStyle>[] = [
	{ value: SubHeadingStyle.BOLD, label: '> **引用加粗格式**' },
	{ value: SubHeadingStyle.HEADING, label: '### 标题格式' }
];

export const DEFAULT_SAVE_FOLDER = 'MovieLog';

export const SETTING_DESCRIPTORS: readonly SettingDescriptor[] = [
	apiKeySetting({
		key: 'tmdbApiKey',
		name: 'TMDB API key',
		desc: '在 themoviedb.org 注册获取免费 API key',
		aliases: ['TMDB', 'API', '密钥'],
		placeholder: '输入你的 TMDB API key',
		normalise: raw => raw.trim()
	}),
	textSetting({
		key: 'defaultSaveFolder',
		name: '默认保存文件夹',
		desc: '新记录保存到的文件夹路径',
		placeholder: DEFAULT_SAVE_FOLDER,
		normalise: raw => raw.trim() || DEFAULT_SAVE_FOLDER
	}),
	dropdownSetting({
		key: 'tmdbLanguage',
		name: 'TMDB 语言',
		desc: '从 TMDB 获取元数据的语言',
		options: TMDB_LANGUAGE_OPTIONS
	}),
	dropdownSetting({
		key: 'sortBy',
		name: '排序方式',
		desc: '卡片墙中的默认排序方式',
		options: SORT_BY_OPTIONS
	}),
	dropdownSetting({
		key: 'subHeadingStyle',
		name: '子标题样式',
		desc: '记录中各区块标题的显示格式',
		options: SUB_HEADING_STYLE_OPTIONS
	}),
	toggleSetting({
		key: 'posterCacheEnabled',
		name: '海报本地缓存',
		desc: '启用后将海报图片下载到本地，离线也能查看。默认关闭。'
	})
];

export const SETTING_KEYS: readonly SettingsKey[] = SETTING_DESCRIPTORS.map(descriptor => descriptor.key);

export function findSettingDescriptor(key: string): SettingDescriptor | undefined {
	return SETTING_DESCRIPTORS.find(descriptor => descriptor.key === key);
}

/**
 * 把控件上报的值写入设置对象。未知的设置项、类型不符、或不在声明选项内的取值
 * 都不会写入，并返回 false。
 */
export function applySettingValue(settings: PluginSettings, key: string, raw: unknown): boolean {
	const descriptor = findSettingDescriptor(key);
	if (!descriptor) return false;
	return descriptor.write(settings, raw);
}
