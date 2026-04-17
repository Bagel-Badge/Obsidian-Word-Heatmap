// 设置面板

import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { PluginSettings } from "./types";
import { DEFAULT_RULES } from "./constants";

// 插件需要向设置面板暴露的接口
export interface SettingsTabContext {
	getSettings: () => PluginSettings;
	saveSettings: () => Promise<void>;
	onSettingsChange: () => void;
}

export class WordHeatmapSettingTab extends PluginSettingTab {
	private ctx: SettingsTabContext;

	constructor(app: App, plugin: Plugin, ctx: SettingsTabContext) {
		super(app, plugin);
		this.ctx = ctx;
	}

	display(): void {
		const { containerEl } = this;
		const settings = this.ctx.getSettings();
		containerEl.empty();

		containerEl.createEl("h2", { text: "中文字数热力图设置" });

		// ======== 基础设置 ========
		containerEl.createEl("h3", { text: "基础设置" });

		new Setting(containerEl)
			.setName("默认展示天数")
			.setDesc("热力图默认展示的时间范围（天数）。代码块中用 days 参数可覆盖此设置。默认 365 天。")
			.addText((text) =>
				text
					.setPlaceholder("365")
					.setValue(String(settings.defaultDays))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						if (!isNaN(n) && n > 0) {
							settings.defaultDays = n;
							await this.save();
						}
					})
			);

		new Setting(containerEl)
			.setName("默认标题")
			.setDesc("热力图上方显示的标题文字。代码块中用 title 参数可覆盖此设置。")
			.addText((text) =>
				text
					.setPlaceholder("写作统计")
					.setValue(settings.defaultTitle)
					.onChange(async (value) => {
						settings.defaultTitle = value;
						await this.save();
					})
			);

		new Setting(containerEl)
			.setName("每周起始日")
			.setDesc("热力图每列的起始星期。中国习惯通常为周一；欧美习惯为周日。")
			.addDropdown((dd) => {
				dd.addOption("0", "周日");
				dd.addOption("1", "周一");
				dd.addOption("2", "周二");
				dd.addOption("3", "周三");
				dd.addOption("4", "周四");
				dd.addOption("5", "周五");
				dd.addOption("6", "周六");
				dd.setValue(String(settings.startOfWeek));
				dd.onChange(async (value) => {
					settings.startOfWeek = parseInt(value, 10) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
					await this.save();
				});
			});

		new Setting(containerEl)
			.setName("显示图例")
			.setDesc("热力图下方的 “少 → 多” 颜色等级指示条。")
			.addToggle((t) =>
				t.setValue(settings.showCellRuleIndicators).onChange(async (v) => {
					settings.showCellRuleIndicators = v;
					await this.save();
				})
			);

		// ======== 统计范围 ========
		containerEl.createEl("h3", { text: "统计范围" });

		new Setting(containerEl)
			.setName("排除文件的 frontmatter 字段名")
			.setDesc(
				"在不想统计的文件 frontmatter 中加入 “<字段名>: true”，该文件将被完全排除在字数统计之外（初始扫描和实时追踪都会跳过）。" +
				"默认字段名为 word-heatmap-exclude，可自定义为你喜欢的名称，例如 exclude-from-stats、不统计 等。" +
				"适用场景：收藏夹、剪藏笔记、模板文件等不代表自己写作量的内容。"
			)
			.addText((text) =>
				text
					.setPlaceholder("word-heatmap-exclude")
					.setValue(settings.excludeField)
					.onChange(async (value) => {
						// 字段名为空时使用默认值，避免意外全部失效
						settings.excludeField = value.trim() || "word-heatmap-exclude";
						await this.save();
					})
			);

		new Setting(containerEl)
			.setName("仅统计指定文件夹")
			.setDesc(
				"限制只统计指定文件夹下的 .md 笔记。留空表示统计整个仓库。多个文件夹路径用英文逗号分隔，例如 “日记,笔记/写作”。"
			)
			.addText((text) =>
				text
					.setPlaceholder("留空表示全部文件")
					.setValue(settings.includeFolders)
					.onChange(async (value) => {
						settings.includeFolders = value;
						await this.save();
					})
			);

		new Setting(containerEl)
			.setName("数据保留天数")
			.setDesc(
				"超过此天数的写作记录将被自动清理以控制 data.json 存储体积。建议保留至少 365 天以便查看过去一年的数据。"
			)
			.addText((text) =>
				text
					.setPlaceholder("365")
					.setValue(String(settings.retentionDays))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						if (!isNaN(n) && n > 0) {
							settings.retentionDays = n;
							await this.save();
						}
					})
			);

		// ======== 每日目标 ========
		containerEl.createEl("h3", { text: "每日目标" });

		new Setting(containerEl)
			.setName("每日目标字数")
			.setDesc(
				"设置每日写作目标字数。启用后状态栏会显示进度，侧边栏会显示进度条，热力图中达标日期会有特殊边框标识。设为 0 表示不启用目标功能。"
			)
			.addText((text) =>
				text
					.setPlaceholder("0 = 关闭")
					.setValue(String(settings.dailyGoal))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						if (!isNaN(n) && n >= 0) {
							settings.dailyGoal = n;
							await this.save();
						}
					})
			);

		// ======== 颜色分级规则 ========
		containerEl.createEl("h3", { text: "颜色分级规则" });
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "根据每日字数映射到不同颜色深度。数值区间为左闭右开，例如 [100, 500) 表示 100 到 499 字。颜色值使用十六进制格式（如 #40c463）。",
		});

		this.renderCellRules(containerEl, settings);

		new Setting(containerEl)
			.setName("重置颜色规则")
			.setDesc("恢复为默认的 4 级颜色区间。")
			.addButton((btn) =>
				btn.setButtonText("重置").onClick(async () => {
					settings.cellStyleRules = DEFAULT_RULES.map((r) => ({ ...r }));
					await this.save();
					this.display();
				})
			);
	}

	private renderCellRules(
		containerEl: HTMLElement,
		settings: PluginSettings
	): void {
		const rules = settings.cellStyleRules;
		rules.forEach((rule, idx) => {
			const row = new Setting(containerEl)
				.setName(`等级 ${idx + 1}`)
				.setDesc(`字数区间 [${rule.min}, ${rule.max})`);

			row.addText((t) => {
				t.setPlaceholder("下限").setValue(String(rule.min))
					.onChange(async (v) => {
						const n = parseInt(v, 10);
						if (!isNaN(n) && n >= 0) { rule.min = n; await this.save(); }
					});
				t.inputEl.style.width = "70px";
			});
			row.addText((t) => {
				t.setPlaceholder("上限").setValue(String(rule.max))
					.onChange(async (v) => {
						const n = parseInt(v, 10);
						if (!isNaN(n) && n > 0) { rule.max = n; await this.save(); }
					});
				t.inputEl.style.width = "70px";
			});
			row.addText((t) => {
				t.setPlaceholder("#40c463").setValue(rule.color)
					.onChange(async (v) => {
						if (/^#[0-9a-fA-F]{3,8}$/.test(v.trim())) {
							rule.color = v.trim();
							preview.style.backgroundColor = v.trim();
							await this.save();
						}
					});
				t.inputEl.style.width = "80px";
			});
			// 颜色预览
			const preview = document.createElement("span");
			preview.className = "word-heatmap-color-preview";
			preview.style.backgroundColor = rule.color;
			row.controlEl.style.flexWrap = "nowrap";
			row.controlEl.style.alignItems = "center";
			row.controlEl.appendChild(preview);
		});
	}

	private async save(): Promise<void> {
		await this.ctx.saveSettings();
		this.ctx.onSettingsChange();
	}
}
