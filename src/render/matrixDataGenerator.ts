// 日期矩阵生成
// 根据给定天数或日期范围生成 ContributionCellData 数组

import { DateTime } from "luxon";
import { Contribution, ContributionCellData } from "../types";
import { diffDays } from "../util/dateUtils";

/**
 * 根据固定日期范围生成单元格数据
 */
export function generateByFixedDate(
	from: Date,
	to: Date,
	data: Contribution[]
): ContributionCellData[] {
	const days = diffDays(from, to) + 1;
	const map = contributionToMap(data);
	const cells: ContributionCellData[] = [];

	const toDateTime = DateTime.fromJSDate(to);
	for (let i = 0; i < days; i++) {
		const current = toDateTime.minus({ days: i });
		const isoDate = current.toFormat("yyyy-MM-dd");
		const contribution = map.get(isoDate);

		cells.unshift({
			date: isoDate,
			weekDay: current.weekday === 7 ? 0 : current.weekday,
			month: current.month - 1,
			monthDate: current.day,
			year: current.year,
			value: contribution ? contribution.value : 0,
			summary: contribution?.summary,
			items: contribution?.items || [],
		});
	}

	return cells;
}

/**
 * 根据最近 N 天生成单元格数据
 */
export function generateByLatestDays(
	days: number,
	data: Contribution[] = []
): ContributionCellData[] {
	const from = new Date();
	from.setDate(from.getDate() - days + 1);
	return generateByFixedDate(from, new Date(), data);
}

function contributionToMap(data: Contribution[]): Map<string, Contribution> {
	const map = new Map<string, Contribution>();
	for (const item of data) {
		let key: string;
		if (typeof item.date === "string") {
			key = item.date;
		} else {
			key = DateTime.fromJSDate(item.date).toFormat("yyyy-MM-dd");
		}
		const existing = map.get(key);
		if (existing) {
			map.set(key, {
				...item,
				value: existing.value + item.value,
			});
		} else {
			map.set(key, item);
		}
	}
	return map;
}
