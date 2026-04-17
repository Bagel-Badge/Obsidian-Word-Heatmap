// CSV 导出工具

import { Notice } from "obsidian";
import { DailyStatsData } from "../types";

/**
 * 把每日数据导出为 CSV 文本
 */
export function buildCsv(data: DailyStatsData, dailyGoal: number): string {
	const rows: string[] = [];
	// 第一行表头
	rows.push("日期,总字数,是否达标,文件明细");
	const dates = Object.keys(data).sort((a, b) => b.localeCompare(a));
	for (const date of dates) {
		const day = data[date];
		const reached = dailyGoal > 0 && day.total >= dailyGoal ? "是" : dailyGoal > 0 ? "否" : "";
		const files = Object.entries(day.files)
			.sort((a, b) => b[1] - a[1])
			.map(([path, count]) => {
				const name = path.split("/").pop() || path;
				return `${name}:${count}`;
			})
			.join(", ");
		rows.push(
			[
				date,
				String(day.total),
				reached,
				csvEscape(files),
			].join(",")
		);
	}
	// UTF-8 BOM 确保 Excel 打开不乱码
	return "\uFEFF" + rows.join("\n");
}

function csvEscape(s: string): string {
	if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
		return '"' + s.replace(/"/g, '""') + '"';
	}
	return s;
}

/**
 * 触发浏览器下载（Obsidian 桌面版环境下亦可工作）
 */
export function downloadCsv(filename: string, content: string): void {
	const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	new Notice(`已导出 ${filename}`);
}
