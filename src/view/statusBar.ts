// 状态栏今日字数显示

import { App } from "obsidian";
import { DailyStatsManager } from "../stats/dailyStats";
import { PluginSettings } from "../types";
import { MESSAGES } from "../i18/messages";
import { VIEW_TYPE_HEATMAP } from "../constants";

export class StatusBarRenderer {
	private app: App;
	private el: HTMLElement;
	private stats: DailyStatsManager;
	private getSettings: () => PluginSettings;
	private unsubscribe: (() => void) | null = null;

	constructor(
		app: App,
		el: HTMLElement,
		stats: DailyStatsManager,
		getSettings: () => PluginSettings
	) {
		this.app = app;
		this.el = el;
		this.stats = stats;
		this.getSettings = getSettings;
		this.el.addClass("word-heatmap-status");
		this.el.setAttribute("aria-label", "点击打开写作统计面板");
		this.el.onclick = () => this.openHeatmapView();
		this.refresh();
		this.unsubscribe = this.stats.onChange(() => this.refresh());
	}

	/**
	 * 刷新显示
	 */
	refresh(): void {
		const total = this.stats.getTodayTotal();
		const goal = this.getSettings().dailyGoal;
		this.el.setText(
			goal > 0
				? MESSAGES.todayWithGoal(total, goal)
				: MESSAGES.today(total)
		);
		if (goal > 0 && total >= goal) {
			this.el.addClass("achieved");
		} else {
			this.el.removeClass("achieved");
		}
	}

	/**
	 * 打开侧边栏视图
	 */
	private async openHeatmapView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_HEATMAP)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: VIEW_TYPE_HEATMAP, active: true });
				leaf = rightLeaf;
			}
		}
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	dispose(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	}
}
