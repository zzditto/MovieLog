import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, PluginSettings, SortBy, SubHeadingStyle } from '../src/types';
import { SETTING_DESCRIPTORS, SettingOption, applySettingValue } from '../src/settings-registry';

function freshSettings(): PluginSettings {
	return { ...DEFAULT_SETTINGS };
}

function dropdownDescriptors() {
	return SETTING_DESCRIPTORS.filter(descriptor => descriptor.control === 'dropdown');
}

/** 把下拉选项读成 value -> label 的映射，数组与记录两种编码都接受。 */
function labelByValue(options: readonly SettingOption[] | Record<string, string>): Map<string, string> {
	return new Map(
		Array.isArray(options)
			? options.map(option => [option.value, option.label] as const)
			: Object.entries(options)
	);
}

describe('设置项注册表', () => {
	it('每个设置项恰好注册一次', () => {
		const settingsKeys = Object.keys(DEFAULT_SETTINGS);
		const registeredKeys = SETTING_DESCRIPTORS.map(descriptor => descriptor.key);

		expect(new Set(registeredKeys)).toEqual(new Set(settingsKeys));
		expect(new Set(registeredKeys).size).toBe(registeredKeys.length);
	});

	it('每个注册项都带有设置搜索所需的名称和描述', () => {
		const names = new Set<string>();

		for (const descriptor of SETTING_DESCRIPTORS) {
			expect(descriptor.name.trim()).not.toBe('');
			expect(descriptor.desc.trim()).not.toBe('');
			names.add(descriptor.name);
		}

		expect(names.size).toBe(SETTING_DESCRIPTORS.length);
	});

	it('下拉控件声明的每个取值都能写入，并各自带有界面文案', () => {
		for (const descriptor of dropdownDescriptors()) {
			const labels = labelByValue(descriptor.options);

			for (const [value, label] of labels) {
				const settings = freshSettings();

				expect(label.trim()).not.toBe('');
				expect(label).not.toBe(value);
				expect(applySettingValue(settings, descriptor.key, value)).toBe(true);
				expect(settings[descriptor.key]).toBe(value);
			}

			expect(new Set(labels.values()).size).toBe(labels.size);
		}
	});

	it('下拉控件的界面文案保持中文原文', () => {
		const labels = labelByValue(
			dropdownDescriptors().flatMap(descriptor => descriptor.options)
		);

		expect(labels.get('zh-CN')).toBe('简体中文');
		expect(labels.get(SortBy.WATCH_DATE)).toBe('观看日期');
		expect(labels.get(SubHeadingStyle.HEADING)).toBe('### 标题格式');
	});

	it('保存文件夹为空或纯空白时回落到默认目录', () => {
		for (const blank of ['', '   ', '\t\n', '  \t  ']) {
			const settings = freshSettings();
			settings.defaultSaveFolder = '旧目录';

			expect(applySettingValue(settings, 'defaultSaveFolder', blank)).toBe(true);
			expect(settings.defaultSaveFolder).toBe(DEFAULT_SETTINGS.defaultSaveFolder);
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
});
