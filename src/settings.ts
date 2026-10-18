import { App, PluginSettingTab, Setting, SettingDefinitionItem, SettingGroupItem } from 'obsidian';
import MovieLogPlugin from './main';
import {
	applySettingValue,
	SETTING_DESCRIPTORS,
	SettingDescriptor,
	DropdownSettingDescriptor,
	TextSettingDescriptor,
	ApiKeySettingDescriptor,
	ToggleSettingDescriptor
} from './settings-registry';

/** 设置标签页的分组标题，两种渲染方式共用同一份文案。 */
const SETTINGS_HEADING = '设置';

/** 一种控件在两种渲染方式下各自的产出：声明式定义与命令式渲染。 */
interface ControlHandlers {
	readonly definition: SettingGroupItem;
	readonly render: (setting: Setting) => void;
}

export class MovieLogSettingTab extends PluginSettingTab {
	plugin: MovieLogPlugin;

	constructor(app: App, plugin: MovieLogPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [{
			type: 'group',
			heading: SETTINGS_HEADING,
			items: SETTING_DESCRIPTORS.map(descriptor => this.controlHandlers(descriptor).definition)
		}];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (!applySettingValue(this.plugin.settings, key, value)) {
			return;
		}

		await this.plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName(SETTINGS_HEADING).setHeading();

		for (const descriptor of SETTING_DESCRIPTORS) {
			const setting = new Setting(containerEl).setName(descriptor.name).setDesc(descriptor.desc);
			this.controlHandlers(descriptor).render(setting);
		}
	}

	/**
	 * 控件种类到「声明式定义 + 命令式渲染」的唯一分派点。两种渲染方式共用同一份
	 * 控件描述，新增一种控件只需在这里补一个分支，不会出现只改了一边的情况。
	 */
	private controlHandlers(descriptor: SettingDescriptor): ControlHandlers {
		const base = {
			name: descriptor.name,
			desc: descriptor.desc,
			aliases: [...descriptor.aliases]
		};

		switch (descriptor.control) {
			case 'api-key': {
				const render = (setting: Setting) => this.renderApiKeySetting(setting, descriptor);
				return { definition: { ...base, render }, render };
			}
			case 'dropdown':
				return {
					definition: {
						...base,
						control: {
							type: 'dropdown',
							key: descriptor.key,
							options: toOptionRecord(descriptor)
						}
					},
					render: setting => this.renderDropdown(setting, descriptor)
				};
			case 'toggle':
				return {
					definition: {
						...base,
						control: {
							type: 'toggle',
							key: descriptor.key
						}
					},
					render: setting => this.renderToggle(setting, descriptor)
				};
			case 'text':
				return {
					definition: {
						...base,
						control: {
							type: 'text',
							key: descriptor.key,
							placeholder: descriptor.placeholder
						}
					},
					render: setting => this.renderText(setting, descriptor)
				};
		}
	}

	private renderText(setting: Setting, descriptor: TextSettingDescriptor): void {
		const current = descriptor.read(this.plugin.settings);
		setting.addText(text => {
			if (descriptor.placeholder !== undefined) {
				text.setPlaceholder(descriptor.placeholder);
			}
			text
				.setValue(current)
				.onChange(async (value) => {
					await this.setControlValue(descriptor.key, value);
				});
		});
	}

	private renderDropdown(setting: Setting, descriptor: DropdownSettingDescriptor): void {
		const current = descriptor.read(this.plugin.settings);
		setting.addDropdown(dropdown => {
			for (const option of descriptor.options) {
				dropdown.addOption(option.value, option.label);
			}
			dropdown
				.setValue(current)
				.onChange(async (value) => {
					await this.setControlValue(descriptor.key, value);
				});
		});
	}

	private renderToggle(setting: Setting, descriptor: ToggleSettingDescriptor): void {
		const current = descriptor.read(this.plugin.settings);
		setting.addToggle(toggle => toggle
			.setValue(current)
			.onChange(async (value) => {
				await this.setControlValue(descriptor.key, value);
			}));
	}

	private renderApiKeySetting(setting: Setting, descriptor: ApiKeySettingDescriptor): void {
		const current = descriptor.read(this.plugin.settings);
		setting
			.addText(text => {
				if (descriptor.placeholder !== undefined) {
					text.setPlaceholder(descriptor.placeholder);
				}
				text
					.setValue(current)
					.onChange(async (value) => {
						await this.setControlValue(descriptor.key, value);
					});
				text.inputEl.type = 'password';
			})
			.addExtraButton(btn => {
				btn
					.setIcon('eye')
					.setTooltip('显示/隐藏 API key')
					.onClick(() => {
						const inputEl = btn.extraSettingsEl
							.closest('.setting-item')
							?.querySelector('input') as HTMLInputElement;
						if (inputEl) {
							const isHidden = inputEl.type === 'password';
							inputEl.type = isHidden ? 'text' : 'password';
							btn.setIcon(isHidden ? 'eye-off' : 'eye');
						}
					});
			});
	}
}

function toOptionRecord(descriptor: DropdownSettingDescriptor): Record<string, string> {
	return Object.fromEntries(descriptor.options.map(option => [option.value, option.label]));
}
