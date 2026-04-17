// 常量定义

import { CellStyleRule, PluginSettings } from "./types";

// 侧边栏视图类型标识
export const VIEW_TYPE_HEATMAP = "word-heatmap-view";

// 默认颜色分级规则（字数区间 → 颜色）
// 区间为左闭右开：[min, max)
export const DEFAULT_RULES: CellStyleRule[] = [
	{
		id: "level_1",
		color: "#9be9a8",
		min: 1,
		max: 100,
	},
	{
		id: "level_2",
		color: "#40c463",
		min: 100,
		max: 500,
	},
	{
		id: "level_3",
		color: "#30a14e",
		min: 500,
		max: 1000,
	},
	{
		id: "level_4",
		color: "#216e39",
		min: 1000,
		max: 999999,
	},
];

// 默认插件设置
export const DEFAULT_SETTINGS: PluginSettings = {
	defaultDays: 365,
	defaultTitle: "写作统计",
	cellStyleRules: DEFAULT_RULES,
	startOfWeek: 1,
	showCellRuleIndicators: true,
	includeFolders: "",
	retentionDays: 365,
	dailyGoal: 0,
	excludeField: "word-heatmap-exclude",
};
