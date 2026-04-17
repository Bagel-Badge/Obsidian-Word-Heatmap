// 字数统计核心
// 规则：
// 1. 只处理纯文本内容
// 2. 先清洗 Markdown 语法（代码块、frontmatter、标题、加粗、列表等）
// 3. 中文按字符数统计，英文按单词数统计，两者相加

// 中文字符正则（基本汉字区）
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/g;
// 英文单词正则
const ENGLISH_WORD_REGEX = /\b[a-zA-Z]+\b/g;

// 清洗规则（顺序重要）
// YAML frontmatter：文件开头的 ---...--- 块
const FRONTMATTER_REGEX = /^---[\s\S]*?\n---\s*/;
// 围栏代码块 ```...```
const FENCED_CODE_REGEX = /```[\s\S]*?```/g;
// 行内代码 `code`
const INLINE_CODE_REGEX = /`[^`\n]+`/g;
// 图片 ![alt](url)
const IMAGE_REGEX = /!\[[^\]]*\]\([^)]*\)/g;
// 链接 [text](url) — 保留 text
const LINK_REGEX = /\[([^\]]+)\]\([^)]*\)/g;
// Obsidian 内部链接 [[target|alias]] — 保留 alias 或 target
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
// HTML 标签
const HTML_TAG_REGEX = /<[^>]+>/g;
// 行首标记：标题、列表、引用、水平线
const HEADING_REGEX = /^#{1,6}\s+/gm;
const LIST_REGEX = /^\s*(?:[-*+]|\d+\.)\s+/gm;
const QUOTE_REGEX = /^\s*>\s?/gm;
const HR_REGEX = /^\s*[-*_]{3,}\s*$/gm;
// 加粗、斜体标记
const EMPHASIS_REGEX = /(\*{1,3}|_{1,3})(?=\S)([^*_\n]+?)\1/g;

/**
 * 清洗 Markdown 语法，返回纯文本内容
 */
export function stripMarkdown(content: string): string {
	let text = content;

	// 先去 frontmatter（只在开头匹配一次）
	text = text.replace(FRONTMATTER_REGEX, "");

	// 再去围栏代码块和行内代码（避免代码中的语法干扰后续清洗）
	text = text.replace(FENCED_CODE_REGEX, "");
	text = text.replace(INLINE_CODE_REGEX, "");

	// 图片（整体去掉）
	text = text.replace(IMAGE_REGEX, "");

	// 普通链接：保留链接文字
	text = text.replace(LINK_REGEX, "$1");

	// Obsidian wiki 链接：保留别名或目标
	text = text.replace(WIKILINK_REGEX, (_m, target, alias) => alias || target);

	// HTML 标签
	text = text.replace(HTML_TAG_REGEX, "");

	// 行首标记
	text = text.replace(HEADING_REGEX, "");
	text = text.replace(LIST_REGEX, "");
	text = text.replace(QUOTE_REGEX, "");
	text = text.replace(HR_REGEX, "");

	// 加粗/斜体：保留内容
	text = text.replace(EMPHASIS_REGEX, "$2");

	return text;
}

/**
 * 统计中文字符数
 */
export function countChineseChars(text: string): number {
	const m = text.match(CHINESE_CHAR_REGEX);
	return m ? m.length : 0;
}

/**
 * 统计英文单词数
 */
export function countEnglishWords(text: string): number {
	const m = text.match(ENGLISH_WORD_REGEX);
	return m ? m.length : 0;
}

/**
 * 对纯文本统计字数（中文字符 + 英文单词）
 */
export function countWords(cleanText: string): number {
	return countChineseChars(cleanText) + countEnglishWords(cleanText);
}

/**
 * 对原始 Markdown 文件内容统计字数（清洗 + 计数一步到位）
 */
export function countFileWords(content: string): number {
	if (!content) {
		return 0;
	}
	const clean = stripMarkdown(content);
	return countWords(clean);
}

// 检测 frontmatter 中是否有指定字段为 true
// 字段名可在设置中自定义，默认 word-heatmap-exclude
/**
 * 判断文件是否被标记为排除统计
 * 在文件 frontmatter 中写入 `<fieldName>: true` 即可排除
 */
export function isFileExcluded(content: string, fieldName: string): boolean {
	if (!fieldName) return false;
	// 转义正则特殊字符
	const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(
		`^---[\\s\\S]*?\\n\\s*${escaped}\\s*:\\s*true\\b[\\s\\S]*?\\n---`
	);
	return regex.test(content);
}
