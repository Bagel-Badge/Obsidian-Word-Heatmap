// 热力图渲染基类，移植并简化自参考项目

import { DEFAULT_RULES } from "../constants";
import {
	CellStyleRule,
	Contribution,
	ContributionCellData,
	ContributionGraphConfig,
	ContributionItem,
} from "../types";
import { MESSAGES } from "../i18/messages";
import { parseDate } from "../util/dateUtils";
import { matchCellStyleRule } from "../util/utils";
import {
	generateByFixedDate,
	generateByLatestDays,
} from "./matrixDataGenerator";

export interface GraphRender {
	render(container: HTMLElement, graphConfig: ContributionGraphConfig): void;
	graphType(): string;
}

export abstract class BaseGraphRender implements GraphRender {
	abstract graphType(): string;
	abstract render(
		container: HTMLElement,
		graphConfig: ContributionGraphConfig
	): void;

	protected createGraphEl(root: HTMLElement): HTMLDivElement {
		return createDiv({ cls: "contribution-graph", parent: root });
	}

	protected createMainEl(
		parent: HTMLElement,
		graphConfig: ContributionGraphConfig
	): HTMLDivElement {
		let cls = "main";
		if (graphConfig.fillTheScreen) {
			cls += " fill-the-screen";
		}
		if (graphConfig.enableMainContainerShadow) {
			cls += " shadow";
		}
		const main = createDiv({ cls, parent });
		if (graphConfig.mainContainerStyle) {
			Object.assign(main.style, graphConfig.mainContainerStyle);
		}
		return main;
	}

	protected renderTitle(
		graphConfig: ContributionGraphConfig,
		parent: HTMLElement
	): HTMLElement {
		const titleEl = createDiv({ cls: "title", parent });
		if (graphConfig.title) {
			titleEl.innerText = graphConfig.title;
		}
		if (graphConfig.titleStyle) {
			Object.assign(titleEl.style, graphConfig.titleStyle);
		}
		return titleEl;
	}

	protected renderCellRuleIndicator(
		graphConfig: ContributionGraphConfig,
		parent: HTMLElement
	): void {
		if (graphConfig.showCellRuleIndicators === false) {
			return;
		}
		const container = createDiv({
			cls: "cell-rule-indicator-container",
			parent,
		});
		const cellRules = this.getCellRules(graphConfig);
		createDiv({ cls: "cell text", text: MESSAGES.less, parent: container });
		cellRules
			.slice()
			.sort((a, b) => a.min - b.min)
			.forEach((rule) => {
				const cellEl = createDiv({ cls: "cell", parent: container });
				cellEl.style.backgroundColor = rule.color;
				cellEl.innerText = rule.text || "";
				cellEl.ariaLabel = `${rule.min} ≤ 字数 ＜ ${rule.max}`;
			});
		createDiv({ cls: "cell text", text: MESSAGES.more, parent: container });
	}

	protected renderActivityContainer(
		parent: HTMLElement
	): HTMLElement {
		return createDiv({ cls: "activity-container", parent });
	}

	protected renderActivity(
		cellData: ContributionCellData,
		container: HTMLElement
	): void {
		container.empty();

		const closeButton = createEl("button", {
			cls: "close-button",
			text: "×",
			parent: container,
		});
		closeButton.onclick = () => container.empty();

		const summary = cellData.value > 0
			? MESSAGES.wroteOnDate(cellData.date, cellData.value)
			: MESSAGES.noWritingOnDate(cellData.date);
		createDiv({ cls: "activity-summary", parent: container, text: summary });

		const items = cellData.items || [];
		if (items.length === 0) {
			return;
		}

		const content = createDiv({ cls: "activity-content", parent: container });
		const list = createDiv({ cls: "activity-list", parent: content });

		const pageSize = 10;
		renderActivityItems(items.slice(0, pageSize), list);

		if (items.length > pageSize) {
			const navigation = createDiv({
				cls: "activity-navigation",
				parent: content,
			});
			let page = 1;
			const loadMore = createEl("a", {
				text: MESSAGES.loadMore,
				href: "#",
				parent: navigation,
			});
			loadMore.onclick = (event) => {
				event.preventDefault();
				page++;
				renderActivityItems(
					items.slice((page - 1) * pageSize, page * pageSize),
					list
				);
				if (page * pageSize >= items.length) {
					loadMore.remove();
				}
			};
		}
	}

	protected generateContributionData(
		graphConfig: ContributionGraphConfig
	): ContributionCellData[] {
		if (graphConfig.days) {
			return generateByLatestDays(graphConfig.days, graphConfig.data);
		}
		if (graphConfig.fromDate && graphConfig.toDate) {
			return generateByFixedDate(
				parseDate(graphConfig.fromDate),
				parseDate(graphConfig.toDate),
				graphConfig.data
			);
		}
		return generateByLatestDays(365, graphConfig.data);
	}

	protected getCellRules(graphConfig: ContributionGraphConfig): CellStyleRule[] {
		return graphConfig.cellStyleRules &&
			graphConfig.cellStyleRules.length > 0
			? graphConfig.cellStyleRules
			: DEFAULT_RULES;
	}

	protected bindMonthTips(
		monthCell: HTMLElement,
		cellData: ContributionCellData,
		contributionMapByYearMonth: Map<string, number>
	): void {
		const ym = `${cellData.year}-${cellData.month + 1}`;
		const value = contributionMapByYearMonth.get(ym) || 0;
		monthCell.ariaLabel = MESSAGES.monthSummary(ym, value);
	}

	protected applyCellGlobalStyle(
		cellEl: HTMLElement,
		graphConfig: ContributionGraphConfig
	): void {
		if (graphConfig.cellStyle) {
			Object.assign(cellEl.style, graphConfig.cellStyle);
		}
	}

	protected applyCellGlobalStylePartial(
		cellEl: HTMLElement,
		graphConfig: ContributionGraphConfig,
		props: string[]
	): void {
		if (graphConfig.cellStyle) {
			const partial: Record<string, unknown> = {};
			for (const p of props) {
				// @ts-ignore
				partial[p] = graphConfig.cellStyle[p];
			}
			Object.assign(cellEl.style, partial);
		}
	}

	protected applyCellStyleRule(
		cellEl: HTMLElement,
		cellData: ContributionCellData,
		cellRules: CellStyleRule[],
		defaultCellStyleRule?: () => CellStyleRule
	): void {
		const rule = matchCellStyleRule(cellData.value, cellRules);
		if (rule !== null) {
			cellEl.style.backgroundColor = rule.color;
			cellEl.innerText = rule.text || "";
			return;
		}
		if (defaultCellStyleRule) {
			const dr = defaultCellStyleRule();
			cellEl.style.backgroundColor = dr.color;
			cellEl.innerText = dr.text || "";
		}
	}

	protected bindCellAttribute(
		cellEl: HTMLElement,
		cellData: ContributionCellData
	): void {
		cellEl.setAttribute("data-year", cellData.year.toString());
		cellEl.setAttribute("data-month", cellData.month.toString());
		cellEl.setAttribute("data-date", cellData.date);
	}

	protected bindCellClickEvent(
		cellEl: HTMLElement,
		cellData: ContributionCellData,
		graphConfig: ContributionGraphConfig,
		activityContainer?: HTMLElement
	): void {
		cellEl.onclick = (event: MouseEvent) => {
			if (graphConfig.onCellClick) {
				graphConfig.onCellClick(cellData, event);
			}
			if (activityContainer) {
				this.renderActivity(cellData, activityContainer);
			}
		};
	}

	protected bindCellTips(
		cellEl: HTMLElement,
		cellData: ContributionCellData
	): void {
		cellEl.ariaLabel = cellData.value > 0
			? MESSAGES.wroteOnDate(cellData.date, cellData.value)
			: MESSAGES.noWritingOnDate(cellData.date);
	}

	/**
	 * 标记达成每日目标的格子（加边框）
	 */
	protected markGoalAchieved(
		cellEl: HTMLElement,
		cellData: ContributionCellData,
		goal: number
	): void {
		if (goal > 0 && cellData.value >= goal) {
			cellEl.classList.add("goal-achieved");
		}
	}
}

function renderActivityItems(
	items: ContributionItem[],
	listMain: HTMLElement
): void {
	items.slice(0, 10).forEach((item) => {
		const li = createDiv({ cls: "activity-item", parent: listMain });
		const linkEl = createEl("a", {
			text: item.label,
			parent: li,
			cls: `label ${item.link?.className || ""}`,
		});
		linkEl.ariaLabel = item.label;
		if (item.link) {
			linkEl.setAttribute("data-href", item.link.href || "#");
			linkEl.setAttribute("href", item.link.href || "#");
			linkEl.setAttribute("target", item.link.target || "_blank");
			linkEl.setAttribute("rel", item.link.rel || "noopener");
		}
		linkEl.onclick = (event) => {
			if (item.open) {
				event.preventDefault();
				item.open(event);
			}
		};
	});
}

// 将 Contribution 数组按年月聚合
export function aggregateByYearMonth(
	cells: ContributionCellData[]
): Map<string, number> {
	const map = new Map<string, number>();
	for (const c of cells) {
		const key = `${c.year}-${c.month + 1}`;
		map.set(key, (map.get(key) || 0) + c.value);
	}
	return map;
}
