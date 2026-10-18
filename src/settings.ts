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

export class MovieLogSettingTab extends PluginSettingTab {
	plugin: MovieLogPlugin;

	constructor(app: App, plugin: MovieLogPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [{
			type: 'group',
			heading: '设置',
			items: SETTING_DESCRIPTORS.map(descriptor => this.toSettingDefinition(descriptor))
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

		new Setting(containerEl).setName('设置').setHeading();

		for (const descriptor of SETTING_DESCRIPTORS) {
			const setting = new Setting(containerEl).setName(descriptor.name).setDesc(descriptor.desc);
			this.renderControl(setting, descriptor);
		}
	}

	private toSettingDefinition(descriptor: SettingDescriptor): SettingGroupItem {
		const base = {
			name: descriptor.name,
			desc: descriptor.desc,
			aliases: [...descriptor.aliases]
		};

		switch (descriptor.control) {
			case 'api-key':
				return {
					...base,
					render: (setting) => this.renderApiKeySetting(setting, descriptor)
				};
			case 'dropdown':
				return {
					...base,
					control: {
						type: 'dropdown',
						key: descriptor.key,
						options: toOptionRecord(descriptor)
					}
				};
			case 'toggle':
				return {
					...base,
					control: {
						type: 'toggle',
						key: descriptor.key
					}
				};
			case 'text':
				return {
					...base,
					control: {
						type: 'text',
						key: descriptor.key,
						placeholder: descriptor.placeholder
					}
				};
		}
	}

	private renderControl(setting: Setting, descriptor: SettingDescriptor): void {
		switch (descriptor.control) {
			case 'api-key':
				this.renderApiKeySetting(setting, descriptor);
				return;
			case 'dropdown':
				this.renderDropdown(setting, descriptor);
				return;
			case 'toggle':
				this.renderToggle(setting, descriptor);
				return;
			case 'text':
				this.renderText(setting, descriptor);
				return;
		}
	}

	private renderText(setting: Setting, descriptor: TextSettingDescriptor): void {
		const current = descriptor.read(this.plugin.settings) as string;
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
		const current = descriptor.read(this.plugin.settings) as string;
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
		const current = descriptor.read(this.plugin.settings) as boolean;
		setting.addToggle(toggle => toggle
			.setValue(current)
			.onChange(async (value) => {
				await this.setControlValue(descriptor.key, value);
			}));
	}

	private renderApiKeySetting(setting: Setting, descriptor: ApiKeySettingDescriptor): void {
		const current = descriptor.read(this.plugin.settings) as string;
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
	const options: Record<string, string> = {};
	for (const option of descriptor.options) {
		options[option.value] = option.label;
	}
	return options;
}
