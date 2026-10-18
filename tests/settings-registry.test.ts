import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, PluginSettings, SortBy, SubHeadingStyle } from '../src/types';
import { SETTING_DESCRIPTORS, SETTING_KEYS, applySettingValue } from '../src/settings-registry';

/** 设置标签页会渲染的全部设置项。 */
const RENDERED_KEYS = [
	'tmdbApiKey',
	'defaultSaveFolder',
	'tmdbLanguage',
	'sortBy',
	'subHeadingStyle',
	'posterCacheEnabled'
];

function freshSettings(): PluginSettings {
	return { ...DEFAULT_SETTINGS };
}

describe('设置项注册表', () => {
	it('每个渲染的设置项恰好注册一次', () => {
		expect([...SETTING_KEYS].sort()).toEqual([...RENDERED_KEYS].sort());
		expect(new Set(SETTING_KEYS).size).toBe(RENDERED_KEYS.length);
		expect(SETTING_DESCRIPTORS).toHaveLength(RENDERED_KEYS.length);
	});

	it('每个注册项都带有设置搜索所需的名称和描述', () => {
		const settingsKeys = Object.keys(DEFAULT_SETTINGS);

		for (const descriptor of SETTING_DESCRIPTORS) {
			expect(settingsKeys).toContain(descriptor.key);
			expect(descriptor.name.trim()).not.toBe('');
			expect(descriptor.desc.trim()).not.toBe('');
			expect(Array.isArray(descriptor.aliases)).toBe(true);
		}
	});

	it('下拉选项接受已声明的取值', () => {
		const settings = freshSettings();

		for (const language of ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']) {
			expect(applySettingValue(settings, 'tmdbLanguage', language)).toBe(true);
			expect(settings.tmdbLanguage).toBe(language);
		}

		for (const sortBy of [SortBy.WATCH_DATE, SortBy.TITLE, SortBy.RATING, SortBy.RELEASE_DATE]) {
			expect(applySettingValue(settings, 'sortBy', sortBy)).toBe(true);
			expect(settings.sortBy).toBe(sortBy);
		}

		for (const style of [SubHeadingStyle.BOLD, SubHeadingStyle.HEADING]) {
			expect(applySettingValue(settings, 'subHeadingStyle', style)).toBe(true);
			expect(settings.subHeadingStyle).toBe(style);
		}
	});

	it('保存文件夹为空或纯空白时回落到默认目录', () => {
		for (const blank of ['', '   ', '\t\n', '  \t  ']) {
			const settings = freshSettings();
			settings.defaultSaveFolder = '旧目录';

			expect(applySettingValue(settings, 'defaultSaveFolder', blank)).toBe(true);
			expect(settings.defaultSaveFolder).toBe('MovieLog');
		}

		const settings = freshSettings();
		expect(applySettingValue(settings, 'defaultSaveFolder', '  我的电影  ')).toBe(true);
		expect(settings.defaultSaveFolder).toBe('我的电影');
	});

	it('下拉选项拒绝未声明的取值，且不写入', () => {
		const rejected: [keyof PluginSettings, unknown][] = [
			['tmdbLanguage', 'de-DE'],
			['tmdbLanguage', ''],
			['sortBy', 'popularity'],
			['subHeadingStyle', 'highlight']
		];

		for (const [key, value] of rejected) {
			const settings = freshSettings();
			const before = { ...settings };

			expect(applySettingValue(settings, key, value)).toBe(false);
			expect(settings).toEqual(before);
		}
	});

	it('未注册的设置项与非法的值类型都不写入', () => {
		const rejected: [string, unknown][] = [
			['unknownSetting', 'value'],
			['', 'value'],
			['defaultSaveFolder', 42],
			['defaultSaveFolder', null],
			['tmdbApiKey', undefined],
			['tmdbLanguage', true],
			['sortBy', null],
			['posterCacheEnabled', 'true']
		];

		for (const [key, value] of rejected) {
			const settings = freshSettings();
			const before = { ...settings };

			expect(applySettingValue(settings, key, value)).toBe(false);
			expect(settings).toEqual(before);
		}
	});

	it('接受布尔开关的取值', () => {
		const settings = freshSettings();
		expect(applySettingValue(settings, 'posterCacheEnabled', true)).toBe(true);
		expect(settings.posterCacheEnabled).toBe(true);
		expect(applySettingValue(settings, 'posterCacheEnabled', false)).toBe(true);
		expect(settings.posterCacheEnabled).toBe(false);
	});

	it('API key 去掉首尾空白后保存', () => {
		const settings = freshSettings();
		expect(applySettingValue(settings, 'tmdbApiKey', '  abc123  ')).toBe(true);
		expect(settings.tmdbApiKey).toBe('abc123');
	});

	it('保留用户可见的文案与搜索别名', () => {
		const byKey = new Map(SETTING_DESCRIPTORS.map(descriptor => [descriptor.key, descriptor]));

		expect(byKey.get('tmdbApiKey')).toMatchObject({
			name: 'TMDB API key',
			desc: '在 themoviedb.org 注册获取免费 API key',
			aliases: ['TMDB', 'API', '密钥']
		});
		expect(byKey.get('defaultSaveFolder')).toMatchObject({
			name: '默认保存文件夹',
			desc: '新记录保存到的文件夹路径',
			placeholder: 'MovieLog'
		});
		expect(byKey.get('tmdbLanguage')).toMatchObject({
			name: 'TMDB 语言',
			desc: '从 TMDB 获取元数据的语言'
		});
		expect(byKey.get('sortBy')).toMatchObject({
			name: '排序方式',
			desc: '卡片墙中的默认排序方式'
		});
		expect(byKey.get('subHeadingStyle')).toMatchObject({
			name: '子标题样式',
			desc: '记录中各区块标题的显示格式'
		});
		expect(byKey.get('posterCacheEnabled')).toMatchObject({
			name: '海报本地缓存',
			desc: '启用后将海报图片下载到本地，离线也能查看。默认关闭。'
		});

		expect(byKey.get('tmdbLanguage')).toMatchObject({
			options: [
				{ value: 'zh-CN', label: '简体中文' },
				{ value: 'zh-TW', label: '繁體中文' },
				{ value: 'en-US', label: 'English' },
				{ value: 'ja-JP', label: '日本語' },
				{ value: 'ko-KR', label: '한국어' }
			]
		});
		expect(byKey.get('sortBy')).toMatchObject({
			options: [
				{ value: SortBy.WATCH_DATE, label: '观看日期' },
				{ value: SortBy.TITLE, label: '标题' },
				{ value: SortBy.RATING, label: '评分' },
				{ value: SortBy.RELEASE_DATE, label: '上映日期' }
			]
		});
		expect(byKey.get('subHeadingStyle')).toMatchObject({
			options: [
				{ value: SubHeadingStyle.BOLD, label: '> **引用加粗格式**' },
				{ value: SubHeadingStyle.HEADING, label: '### 标题格式' }
			]
		});
	});
});
