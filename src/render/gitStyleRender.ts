// Git 风格热力图渲染（一列一周，从上到下周日到周六）

import { ContributionCellData, ContributionGraphConfig } from "../types";
import { distanceBeforeTheStartOfWeek } from "../util/dateUtils";
import {
	localizedMonthMapping,
	localizedWeekDayMapping,
} from "../i18/messages";
import {
	BaseGraphRender,
	aggregateByYearMonth,
} from "./graphRender";

export class GitStyleRender extends BaseGraphRender {
	graphType(): string {
		return "default";
	}

	render(root: HTMLElement, graphConfig: ContributionGraphConfig): void {
		const graphEl = this.createGraphEl(root);
		const main = this.createMainEl(graphEl, graphConfig);

		if (graphConfig.title && graphConfig.title.trim() !== "") {
			this.renderTitle(graphConfig, main);
		}

		const chartsEl = createDiv({ cls: ["charts", "default"], parent: main });

		this.renderCellRuleIndicator(graphConfig, main);
		const activityContainer = this.renderActivityContainer(main);

		// 周次指示列
		const weekTextColumn = createDiv({ cls: "column", parent: chartsEl });
		this.renderWeekIndicator(weekTextColumn, graphConfig);

		const cells = this.generateContributionData(graphConfig);

		// 在最左列补洞，保证第一格对齐到 startOfWeek
		if (cells.length > 0) {
			const from = new Date(cells[0].date);
			const firstHoleCount = distanceBeforeTheStartOfWeek(
				graphConfig.startOfWeek || 0,
				from.getDay()
			);
			for (let i = 0; i < firstHoleCount; i++) {
				cells.unshift({
					date: "$HOLE$",
					weekDay: -1,
					month: -1,
					monthDate: -1,
					year: -1,
					value: 0,
				});
			}
		}

		const yearMonthMap = aggregateByYearMonth(cells);
		const cellRules = this.getCellRules(graphConfig);
		const goal = graphConfig.dailyGoal || 0;

		let columnEl: HTMLDivElement | null = null;
		for (let i = 0; i < cells.length; i++) {
			if (i % 7 === 0) {
				columnEl = document.createElement("div");
				columnEl.className = "column";
				chartsEl.appendChild(columnEl);
			}
			const item = cells[i];

			// 每月第一天加月份标签
			if (item.monthDate === 1 && columnEl) {
				const monthCell = createDiv({
					cls: "month-indicator",
					parent: columnEl,
				});
				monthCell.innerText = localizedMonthMapping(item.month);
				this.bindMonthTips(monthCell, item, yearMonthMap);
			}

			const cellEl = document.createElement("div");
			columnEl?.appendChild(cellEl);

			if (item.value === 0) {
				if (item.date !== "$HOLE$") {
					cellEl.className = "cell empty";
					this.applyCellGlobalStyle(cellEl, graphConfig);
					this.applyCellStyleRule(cellEl, item, cellRules);
					this.bindCellAttribute(cellEl, item);
					this.bindCellTips(cellEl, item);
					this.bindCellClickEvent(
						cellEl,
						item,
						graphConfig,
						activityContainer
					);
				} else {
					cellEl.className = "cell";
					this.applyCellGlobalStylePartial(cellEl, graphConfig, [
						"minWidth",
						"minHeight",
					]);
				}
			} else {
				cellEl.className = "cell";
				this.applyCellGlobalStyle(cellEl, graphConfig);
				this.applyCellStyleRule(
					cellEl,
					item,
					cellRules,
					() => cellRules[0]
				);
				this.bindCellAttribute(cellEl, item);
				this.bindCellClickEvent(
					cellEl,
					item,
					graphConfig,
					activityContainer
				);
				this.bindCellTips(cellEl, item);
				this.markGoalAchieved(cellEl, item, goal);
			}
		}
	}

	private renderWeekIndicator(
		container: HTMLDivElement,
		graphConfig: ContributionGraphConfig
	): void {
		const startOfWeek = graphConfig.startOfWeek || 0;
		for (let i = 0; i < 7; i++) {
			const weekdayCell = document.createElement("div");
			weekdayCell.className = "cell week-indicator";
			this.applyCellGlobalStyle(weekdayCell, graphConfig);
			// 只显示周一、周三、周五，避免拥挤
			if (i === 1 || i === 3 || i === 5) {
				weekdayCell.innerText = localizedWeekDayMapping(
					(i + startOfWeek) % 7
				);
			}
			container.appendChild(weekdayCell);
		}
	}
}
