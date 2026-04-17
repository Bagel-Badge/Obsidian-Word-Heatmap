// 日期工具函数

import { DateTime } from "luxon";

/**
 * 解析日期字符串或 Date 对象
 */
export function parseDate(date: string | Date): Date {
	if (typeof date === "string") {
		return new Date(date);
	}
	return date;
}

/**
 * 计算两个日期之间相差的天数
 */
export function diffDays(date1: Date, date2: Date): number {
	const from = DateTime.fromJSDate(date1);
	const to = DateTime.fromJSDate(date2);
	return to.diff(from, "days").days;
}

/**
 * 格式化日期为 yyyy-MM-dd
 */
export function toFormattedDate(date: Date): string {
	const y = date.getFullYear();
	const m = date.getMonth() + 1;
	const d = date.getDate();
	return `${y}-${m < 10 ? "0" + m : m}-${d < 10 ? "0" + d : d}`;
}

/**
 * 获取当天日期的 yyyy-MM-dd 字符串
 */
export function today(): string {
	return toFormattedDate(new Date());
}

/**
 * 计算某天相对周起始日的偏移（用于热力图补洞）
 */
export function distanceBeforeTheStartOfWeek(
	startOfWeek: number,
	weekDate: number
): number {
	return (weekDate - startOfWeek + 7) % 7;
}

/**
 * 判断是否为今天
 */
export function isToday(date: Date): boolean {
	const t = new Date();
	return (
		date.getDate() === t.getDate() &&
		date.getMonth() === t.getMonth() &&
		date.getFullYear() === t.getFullYear()
	);
}
