// 连续写作天数计算

import { DailyStatsData } from "../types";
import { toFormattedDate } from "../util/dateUtils";

export interface StreakResult {
	current: number;
	longest: number;
}

/**
 * 计算连续写作天数
 * @param data 每日数据
 * @param goal 每日目标字数，0 表示只要有字数就算
 */
export function calculateStreak(data: DailyStatsData, goal: number): StreakResult {
	const threshold = goal > 0 ? goal : 1;
	const qualifies = (date: string): boolean => {
		const d = data[date];
		return !!d && d.total >= threshold;
	};

	// 当前连续天数：从今天往前回溯
	// 若今天未达标，则从昨天开始算（不打断 streak）
	let current = 0;
	const cursor = new Date();
	const todayStr = toFormattedDate(cursor);
	const startFromYesterday = !qualifies(todayStr);
	if (startFromYesterday) {
		cursor.setDate(cursor.getDate() - 1);
	}
	// 最多回溯 10 年，避免数据异常时死循环
	const maxBack = 365 * 10;
	for (let i = 0; i < maxBack; i++) {
		const s = toFormattedDate(cursor);
		if (qualifies(s)) {
			current++;
			cursor.setDate(cursor.getDate() - 1);
		} else {
			break;
		}
	}

	// 最长连续天数：遍历所有日期排序后扫描
	const dates = Object.keys(data)
		.filter((d) => qualifies(d))
		.sort();
	let longest = 0;
	let streak = 0;
	let prev: string | null = null;
	for (const d of dates) {
		if (prev === null) {
			streak = 1;
		} else {
			const prevDate = new Date(prev);
			prevDate.setDate(prevDate.getDate() + 1);
			const expected = toFormattedDate(prevDate);
			if (expected === d) {
				streak++;
			} else {
				streak = 1;
			}
		}
		if (streak > longest) {
			longest = streak;
		}
		prev = d;
	}

	if (current > longest) {
		longest = current;
	}

	return { current, longest };
}
