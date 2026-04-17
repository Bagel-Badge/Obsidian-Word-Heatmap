// 侧边栏热力图视图

import { ItemView, WorkspaceLeaf, App, TFile, Platform } from "obsidian";
import { VIEW_TYPE_HEATMAP } from "../constants";
import { ContributionGraphConfig, ContributionItem, PluginSettings } from "../types";
import { GitStyleRender } from "../render/gitStyleRender";
import { DailyStatsManager } from "../stats/dailyStats";
import { calculateStreak } from "../stats/streakCalculator";
import { MESSAGES } from "../i18/messages";
import { today } from "../util/dateUtils";

// 插件需要向视图暴露的接口
export interface HeatmapViewContext {
	app: App;
	stats: DailyStatsManager;
	getSettings: () => PluginSettings;
}

export class HeatmapView extends ItemView {
	private ctx: HeatmapViewContext;
	private render = new GitStyleRender();
	// 各区域的容器引用
	private todayEl: HTMLElement | null = null;
	private progressEl: HTMLElement | null = null;
	private streakEl: HTMLElement | null = null;
	private graphContainer: HTMLElement | null = null;
	// 注销变更回调
	private unsubscribe: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, ctx: HeatmapViewContext) {
		super(leaf);
		this.ctx = ctx;
	}

	getViewType(): string {
		return VIEW_TYPE_HEATMAP;
	}

	getDisplayText(): string {
		return MESSAGES.viewTitle;
	}

	getIcon(): string {
		return "flame";
	}

	async onOpen(): Promise<void> {
		this.buildLayout();
		this.unsubscribe = this.ctx.stats.onChange(() => {
			this.refreshTodayArea();
		});
	}

	async onClose(): Promise<void> {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	}

	/**
	 * 构建整体布局
	 */
	private buildLayout(): void {
		const container = this.contentEl;
		container.empty();
		container.addClass("word-heatmap-view");

		// 顶部区：标题 + 今日字数 + 进度条 + streak + 刷新按钮
		const header = createDiv({ cls: "word-heatmap-header", parent: container });

		const titleRow = createDiv({ cls: "word-heatmap-title-row", parent: header });
		createDiv({ cls: "word-heatmap-title", parent: titleRow, text: MESSAGES.viewTitle });

		const refreshBtn = createEl("button", {
			cls: "word-heatmap-refresh",
			text: MESSAGES.refreshButton,
			parent: titleRow,
		});
		refreshBtn.onclick = () => this.redrawGraph();

		this.todayEl = createDiv({ cls: "word-heatmap-today", parent: header });
		this.progressEl = createDiv({ cls: "word-heatmap-progress", parent: header });
		this.streakEl = createDiv({ cls: "word-heatmap-streak", parent: header });

		// 热力图区
		this.graphContainer = createDiv({
			cls: "word-heatmap-graph",
			parent: container,
		});

		// 初次填充
		this.refreshTodayArea();
		this.redrawGraph();
	}

	/**
	 * 刷新今日字数、进度条、streak（高频调用，不重绘整个图）
	 */
	private refreshTodayArea(): void {
		if (!this.todayEl || !this.progressEl || !this.streakEl) {
			return;
		}
		const settings = this.ctx.getSettings();
		const todayTotal = this.ctx.stats.getTodayTotal();
		const goal = settings.dailyGoal;

		// 今日字数
		this.todayEl.setText(
			goal > 0
				? MESSAGES.todayWithGoal(todayTotal, goal)
				: MESSAGES.today(todayTotal)
		);

		// 进度条
		this.progressEl.empty();
		if (goal > 0) {
			const bar = createDiv({ cls: "progress-bar", parent: this.progressEl });
			const fill = createDiv({ cls: "progress-bar-fill", parent: bar });
			const percent = Math.min(100, Math.round((todayTotal / goal) * 100));
			fill.style.width = `${percent}%`;
			if (todayTotal >= goal) {
				fill.addClass("achieved");
			}
		}

		// streak
		const streak = calculateStreak(this.ctx.stats.getAllData(), goal);
		this.streakEl.setText(MESSAGES.streak(streak.current, streak.longest));

		// 同步更新当天格子的颜色（如果已渲染）
		this.syncTodayCell(todayTotal);
	}

	/**
	 * 重绘整张热力图
	 */
	redrawGraph(): void {
		if (!this.graphContainer) return;
		this.graphContainer.empty();
		const settings = this.ctx.getSettings();
		const days = settings.defaultDays;
		const data = this.ctx.stats.getContributions(days);

		if (data.length === 0 && this.ctx.stats.getTodayTotal() === 0) {
			createDiv({
				cls: "word-heatmap-empty",
				parent: this.graphContainer,
				text: MESSAGES.noData,
			});
			return;
		}

		const config: ContributionGraphConfig = {
			title: "",
			titleStyle: {},
			mainContainerStyle: {},
			days,
			data,
			cellStyle: {},
			cellStyleRules: settings.cellStyleRules,
			fillTheScreen: false,
			enableMainContainerShadow: false,
			showCellRuleIndicators: settings.showCellRuleIndicators,
			graphType: "default",
			startOfWeek: settings.startOfWeek,
			dailyGoal: settings.dailyGoal,
			onCellClick: (cellData) => {
				// 点击时替换回调：用内置的 activity 渲染
			},
		};
		// 为了让点击后能打开文件，重写 items 的 open 回调
		for (const c of data) {
			if (c.items) {
				for (const item of c.items) {
					this.bindItemOpen(item);
				}
			}
		}
		this.render.render(this.graphContainer, config);
	}

	/**
	 * 同步更新当天格子的颜色（避免重绘整个图）
	 */
	private syncTodayCell(value: number): void {
		if (!this.graphContainer) return;
		const t = today();
		const cell = this.graphContainer.querySelector(
			`.cell[data-date="${t}"]`
		) as HTMLElement | null;
		if (!cell) {
			// 如果今天的格子还没有渲染（可能是跨天后新一天），直接重绘
			this.redrawGraph();
			return;
		}
		const settings = this.ctx.getSettings();
		const rules = settings.cellStyleRules;
		// 找匹配的规则
		let matched = null;
		for (const r of rules) {
			if (value >= r.min && value < r.max) {
				matched = r;
				break;
			}
		}
		if (value === 0) {
			cell.className = "cell empty";
			cell.style.backgroundColor = "";
		} else if (matched) {
			cell.className = "cell";
			cell.style.backgroundColor = matched.color;
		}
		// 每日目标标记
		if (settings.dailyGoal > 0 && value >= settings.dailyGoal) {
			cell.classList.add("goal-achieved");
		} else {
			cell.classList.remove("goal-achieved");
		}
		// 更新 tooltip
		cell.ariaLabel = value > 0
			? MESSAGES.wroteOnDate(t, value)
			: MESSAGES.noWritingOnDate(t);
	}

	/**
	 * 为详情列表项绑定跳转打开笔记的回调
	 */
	private bindItemOpen(item: ContributionItem): void {
		if (!item.link) return;
		const path = item.link.href;
		item.open = (e: MouseEvent) => {
			const file = this.ctx.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				this.ctx.app.workspace.openLinkText(
					path,
					"",
					e.ctrlKey || (e.metaKey && Platform.isMacOS)
				);
			}
		};
	}
}
