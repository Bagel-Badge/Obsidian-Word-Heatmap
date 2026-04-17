// 国际化（默认中文）

export const MONTH_NAMES = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
export const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export function localizedMonthMapping(month: number): string {
	return MONTH_NAMES[month] || "";
}

export function localizedWeekDayMapping(weekday: number): string {
	return WEEKDAY_NAMES[weekday] || "";
}

export const MESSAGES = {
	// 图例
	less: "少",
	more: "多",
	// tooltip
	wroteOnDate: (date: string, value: number) => `${date} 写了 ${value} 个字`,
	noWritingOnDate: (date: string) => `${date} 没有写作记录`,
	// 详情面板
	detailTitle: (date: string) => `${date} 的写作记录`,
	detailSummary: (value: number) => `共 ${value} 个字`,
	loadMore: "点击加载更多",
	// 侧边栏
	today: (value: number) => `今日：${value} 字`,
	todayWithGoal: (value: number, goal: number) => `今日：${value} / ${goal} 字`,
	streak: (current: number, longest: number) =>
		`连续写作 ${current} 天 · 最长 ${longest} 天`,
	viewTitle: "写作统计",
	refreshButton: "刷新",
	noData: "暂无数据，开始写作试试~",
	// 月份 tooltip
	monthSummary: (yearMonth: string, value: number) =>
		`${yearMonth} 共写了 ${value} 个字`,
	// 命令
	cmdOpenView: "打开写作统计面板",
	cmdInsertHeatmap: "插入字数热力图代码块",
	cmdExport: "导出写作统计为 CSV",
};
