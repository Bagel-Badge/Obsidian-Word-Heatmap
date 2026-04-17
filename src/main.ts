// 插件入口

import {
	Editor,
	MarkdownFileInfo,
	MarkdownPostProcessorContext,
	MarkdownView,
	Notice,
	Plugin,
	TAbstractFile,
	TFile,
	WorkspaceLeaf,
	parseYaml,
} from "obsidian";
import { DEFAULT_SETTINGS, VIEW_TYPE_HEATMAP } from "./constants";
import { DailyStatsManager, PersistedData } from "./stats/dailyStats";
import { EditorChangeTracker } from "./editor/editorExtension";
import { HeatmapView } from "./view/heatmapView";
import { StatusBarRenderer } from "./view/statusBar";
import { WordHeatmapSettingTab } from "./settings";
import { GitStyleRender } from "./render/gitStyleRender";
import { ContributionGraphConfig, PluginSettings } from "./types";
import { MESSAGES } from "./i18/messages";
import { buildCsv, downloadCsv } from "./util/csvExporter";
import { toFormattedDate } from "./util/dateUtils";

export default class WordHeatmapPlugin extends Plugin {
	settings: PluginSettings = { ...DEFAULT_SETTINGS };
	stats!: DailyStatsManager;
	private editorTracker!: EditorChangeTracker;
	private statusBar: StatusBarRenderer | null = null;

	async onload(): Promise<void> {
		await this.loadPersisted();

		// 初始化数据管理
		this.stats.setSaveFn(() => this.persist());

		// 编辑器监听
		this.editorTracker = new EditorChangeTracker(
			this.app,
			this.stats,
			() => this.settings
		);

		// 注册侧边栏视图
		this.registerView(
			VIEW_TYPE_HEATMAP,
			(leaf: WorkspaceLeaf) =>
				new HeatmapView(leaf, {
					app: this.app,
					stats: this.stats,
					getSettings: () => this.settings,
				})
		);

		// ribbon 图标
		this.addRibbonIcon("flame", "打开写作统计面板", () => {
			void this.activateView();
		});

		// 状态栏
		const statusEl = this.addStatusBarItem();
		this.statusBar = new StatusBarRenderer(
			this.app,
			statusEl,
			this.stats,
			() => this.settings
		);

		// 设置面板
		this.addSettingTab(
			new WordHeatmapSettingTab(this.app, this, {
				getSettings: () => this.settings,
				saveSettings: () => this.saveSettings(),
				onSettingsChange: () => this.onSettingsChange(),
			})
		);

		// 代码块渲染器
		this.registerMarkdownCodeBlockProcessor(
			"word-heatmap",
			(source, el, ctx) => this.renderCodeBlock(source, el, ctx)
		);

		// 命令
		this.addCommand({
			id: "open-heatmap-view",
			name: MESSAGES.cmdOpenView,
			callback: () => this.activateView(),
		});
		this.addCommand({
			id: "insert-word-heatmap",
			name: MESSAGES.cmdInsertHeatmap,
			editorCallback: (editor: Editor) => {
				const snippet = "\n```word-heatmap\ntitle: 我的写作统计\ndays: 365\n```\n";
				editor.replaceSelection(snippet);
			},
		});
		this.addCommand({
			id: "export-writing-stats",
			name: MESSAGES.cmdExport,
			callback: () => {
				const csv = buildCsv(this.stats.getAllData(), this.settings.dailyGoal);
				const filename = `word-heatmap-${toFormattedDate(new Date())}.csv`;
				downloadCsv(filename, csv);
			},
		});

		// vault 事件（编辑器事件不覆盖外部修改场景）
		this.registerEvent(
			this.app.workspace.on(
				"editor-change",
				(editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
					this.editorTracker.onEditorChange(editor, info);
				}
			)
		);
		this.registerEvent(
			this.app.vault.on("modify", (file: TAbstractFile) => {
				if (file instanceof TFile) {
					this.editorTracker.onVaultModify(file);
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
				if (file instanceof TFile) {
					this.editorTracker.onVaultRename(file, oldPath);
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", (file: TAbstractFile) => {
				if (file instanceof TFile) {
					this.editorTracker.onVaultDelete(file);
				}
			})
		);

		// 首次加载：如需全量扫描则在 layout ready 后执行
		this.app.workspace.onLayoutReady(() => {
			void this.performInitialScanIfNeeded();
			// 清理过期数据
			this.stats.cleanupOldData(this.settings.retentionDays);
		});
	}

	async onunload(): Promise<void> {
		if (this.statusBar) {
			this.statusBar.dispose();
			this.statusBar = null;
		}
		await this.stats.flushSave();
	}

	/**
	 * 加载持久化数据
	 */
	private async loadPersisted(): Promise<void> {
		const raw = (await this.loadData()) as PersistedData | null;
		this.settings = {
			...DEFAULT_SETTINGS,
			...(raw?.settings || {}),
		};
		// 颜色规则需要深拷贝以免修改默认值
		if (!raw?.settings?.cellStyleRules) {
			this.settings.cellStyleRules = DEFAULT_SETTINGS.cellStyleRules.map((r) => ({ ...r }));
		}
		this.stats = new DailyStatsManager(this.app);
		this.stats.load(raw);
	}

	/**
	 * 持久化保存
	 */
	private async persist(): Promise<void> {
		const persisted = this.stats.getPersistedData();
		await this.saveData({
			...persisted,
			settings: this.settings,
		});
	}

	/**
	 * 保存设置并持久化
	 */
	async saveSettings(): Promise<void> {
		await this.persist();
	}

	/**
	 * 设置变更后通知所有视图刷新
	 */
	private onSettingsChange(): void {
		// 通知状态栏刷新
		this.statusBar?.refresh();
		// 通知热力图视图重绘
		this.app.workspace.getLeavesOfType(VIEW_TYPE_HEATMAP).forEach((leaf) => {
			const view = leaf.view;
			if (view instanceof HeatmapView) {
				view.redrawGraph();
			}
		});
	}

	/**
	 * 打开侧边栏视图
	 */
	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_HEATMAP)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (!rightLeaf) {
				return;
			}
			await rightLeaf.setViewState({ type: VIEW_TYPE_HEATMAP, active: true });
			leaf = rightLeaf;
		}
		workspace.revealLeaf(leaf);
	}

	/**
	 * 首次安装时全量扫描
	 */
	private async performInitialScanIfNeeded(): Promise<void> {
		if (!this.stats.needsInitialScan()) {
			return;
		}
		const notice = new Notice("字数热力图：首次扫描 vault 中……", 0);
		try {
			const files = this.app.vault.getMarkdownFiles();
			await this.stats.initialScan(
				files,
				this.settings.includeFolders,
				this.settings.excludeField,
				(done, total) => {
					notice.setMessage(`字数热力图：扫描中 ${done} / ${total}`);
				}
			);
			new Notice("字数热力图：扫描完成");
		} finally {
			notice.hide();
		}
	}

	/**
	 * 代码块渲染
	 */
	private renderCodeBlock(
		source: string,
		el: HTMLElement,
		_ctx: MarkdownPostProcessorContext
	): void {
		let yamlConfig: Record<string, unknown> = {};
		try {
			yamlConfig = (source.trim() ? parseYaml(source) : {}) || {};
		} catch (e) {
			el.createEl("pre", {
				text: `解析代码块配置出错：${(e as Error).message}`,
			});
			return;
		}

		const days = Number(yamlConfig.days) || this.settings.defaultDays;
		const title = (yamlConfig.title as string) ?? this.settings.defaultTitle;
		const startOfWeek =
			(Number(yamlConfig.startOfWeek) as 0 | 1 | 2 | 3 | 4 | 5 | 6) ||
			this.settings.startOfWeek;

		const data = this.stats.getContributions(days);
		// 为 items 绑定打开回调
		data.forEach((c) => {
			c.items?.forEach((item) => {
				const path = item.link?.href;
				if (path) {
					item.open = (e: MouseEvent) => {
						const af = this.app.vault.getAbstractFileByPath(path);
						if (af instanceof TFile) {
							this.app.workspace.openLinkText(path, "", e.ctrlKey || e.metaKey);
						}
					};
				}
			});
		});

		const config: ContributionGraphConfig = {
			title,
			titleStyle: {},
			mainContainerStyle: {},
			days,
			data,
			cellStyle: {},
			cellStyleRules: this.settings.cellStyleRules,
			fillTheScreen: false,
			enableMainContainerShadow: false,
			showCellRuleIndicators: this.settings.showCellRuleIndicators,
			graphType: "default",
			startOfWeek,
			dailyGoal: this.settings.dailyGoal,
		};
		new GitStyleRender().render(el, config);
	}
}
