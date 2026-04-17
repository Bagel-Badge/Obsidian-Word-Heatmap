// 类型定义

import { DEFAULT_RULES } from "./constants";

// 单元格样式规则：根据字数区间映射到颜色
export interface CellStyleRule {
	id: string | number;
	// 单元格背景颜色
	color: string;
	// 单元格内显示的文字（一般为空）
	text?: string | undefined;
	// 字数下限（包含）
	min: number;
	// 字数上限（不包含）
	max: number;
}

// 热力图配置项
export class ContributionGraphConfig {
	title = "写作统计";
	titleStyle: Partial<CSSStyleDeclaration> = {};
	mainContainerStyle: Partial<CSSStyleDeclaration> = {};
	days?: number | undefined;
	fromDate?: Date | string | undefined;
	toDate?: Date | string | undefined;
	data: Contribution[] = [];
	cellStyle: Partial<CSSStyleDeclaration> = {};
	cellStyleRules: CellStyleRule[] = DEFAULT_RULES;
	fillTheScreen = false;
	enableMainContainerShadow = false;
	showCellRuleIndicators = true;
	graphType: "default" = "default";
	startOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1;
	// 每日目标字数，0 表示关闭
	dailyGoal = 0;
	onCellClick?: (
		cellData: ContributionCellData,
		event: MouseEvent | undefined
	) => void | undefined;
}

// 单日写作数据项（传给渲染层）
export interface Contribution {
	// 日期，格式 yyyy-MM-dd
	date: string | Date;
	// 当日总字数
	value: number;
	// 鼠标悬停时的提示文字
	summary?: string | undefined;
	// 当日编辑的文件明细
	items?: ContributionItem[];
}

// 当日单个文件的字数记录
export interface ContributionItem {
	label: string;
	value: number;
	link?: ContributionItemLink;
	open?: (e: MouseEvent) => void;
}

export interface ContributionItemLink {
	href: string;
	target?: string;
	className?: string;
	rel?: string;
}

// 渲染用的单元格数据
export class ContributionCellData {
	date = ""; // yyyy-MM-dd
	weekDay = 0; // 0 - 6
	month = 0; // 0 - 11
	monthDate = 1; // 1 - 31
	year = 0;
	value = 0;
	summary?: string;
	items?: ContributionItem[];
}

// 插件设置
export interface PluginSettings {
	// 默认展示天数
	defaultDays: number;
	// 默认标题
	defaultTitle: string;
	// 颜色分级规则
	cellStyleRules: CellStyleRule[];
	// 每周起始日 0=周日 1=周一
	startOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	// 是否显示图例
	showCellRuleIndicators: boolean;
	// 统计范围（文件夹路径，逗号分隔，空表示全部）
	includeFolders: string;
	// 数据保留天数
	retentionDays: number;
	// 每日目标字数，0 为关闭
	dailyGoal: number;
	// 排除统计的 frontmatter 字段名
	excludeField: string;
}

// 单日数据结构：总字数 + 各文件字数明细
export interface DailyData {
	total: number;
	files: { [filePath: string]: number };
}

// 全部每日数据
export interface DailyStatsData {
	[date: string]: DailyData;
}
