// 通用工具函数

import { CellStyleRule } from "../types";

/**
 * 按 key 聚合数组元素
 */
export function mapBy<T, R>(
	arr: T[],
	keyMapping: (item: T) => string,
	valueMapping: (item: T) => R,
	aggregator: (a: R, b: R) => R
): Map<string, R> {
	const map = new Map<string, R>();
	for (const item of arr) {
		const key = keyMapping(item);
		if (map.has(key)) {
			map.set(key, aggregator(map.get(key) as R, valueMapping(item)));
		} else {
			map.set(key, valueMapping(item));
		}
	}
	return map;
}

/**
 * 根据字数值匹配对应的单元格样式规则
 */
export function matchCellStyleRule(
	value: number,
	rules: CellStyleRule[]
): CellStyleRule | null {
	for (let i = 0; i < rules.length; i++) {
		if (value >= rules[i].min && value < rules[i].max) {
			return rules[i];
		}
	}
	return null;
}

/**
 * 简易防抖函数
 */
export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	wait: number
): T & { flush: () => void; cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: any[] | null = null;

	const debounced = function (this: unknown, ...args: any[]) {
		lastArgs = args;
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			fn.apply(this, args);
			timer = null;
			lastArgs = null;
		}, wait);
	} as T & { flush: () => void; cancel: () => void };

	debounced.flush = () => {
		if (timer && lastArgs) {
			clearTimeout(timer);
			fn.apply(null, lastArgs);
			timer = null;
			lastArgs = null;
		}
	};

	debounced.cancel = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
			lastArgs = null;
		}
	};

	return debounced;
}
