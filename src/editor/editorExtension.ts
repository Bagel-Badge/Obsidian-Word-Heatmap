// 编辑器变更监听器
// 通过 workspace 的 editor-change 事件监听编辑器内容变化，
// 对当前文件全文做清洗+统计，与上次快照做差值，增量更新 dailyStats。

import { App, Editor, MarkdownFileInfo, MarkdownView, TFile, Vault } from "obsidian";
import { DailyStatsManager } from "../stats/dailyStats";
import { countFileWords, isFileExcluded } from "../stats/wordCounter";
import { today } from "../util/dateUtils";
import { debounce } from "../util/utils";
import { PluginSettings } from "../types";

export class EditorChangeTracker {
	private app: App;
	private stats: DailyStatsManager;
	private getSettings: () => PluginSettings;
	// 对每个文件的变更做防抖（200ms），避免连续敲击产生过多统计
	private perFileDebouncers = new Map<string, () => void>();

	constructor(app: App, stats: DailyStatsManager, getSettings: () => PluginSettings) {
		this.app = app;
		this.stats = stats;
		this.getSettings = getSettings;
	}

	/**
	 * 判断文件是否在统计范围内
	 */
	private isInScope(path: string): boolean {
		const { includeFolders } = this.getSettings();
		if (!includeFolders.trim()) {
			return true;
		}
		const folders = includeFolders
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		return folders.some((f) => path.startsWith(f));
	}

	/**
	 * 处理单个文件的字数更新
	 */
	private async processFile(file: TFile): Promise<void> {
		if (file.extension !== "md") {
			return;
		}
		if (!this.isInScope(file.path)) {
			return;
		}
		try {
			const content = await this.app.vault.cachedRead(file);
			if (isFileExcluded(content, this.getSettings().excludeField)) {
				this.stats.removeFileSnapshot(file.path);
				return;
			}
			const count = countFileWords(content);
			const prev = this.stats.getFileSnapshot(file.path);
			if (prev === undefined) {
				// 首次见到该文件：记录快照，但不产生字数变化
				// 这避免打开一个旧文件就把它的字数全部计入当天
				this.stats.setFileSnapshot(file.path, count);
				return;
			}
			const delta = count - prev;
			if (delta !== 0) {
				this.stats.updateFileCount(today(), file.path, delta);
				this.stats.setFileSnapshot(file.path, count);
			}
		} catch (e) {
			console.error("字数热力图：处理文件出错", file.path, e);
		}
	}

	/**
	 * 获取或创建文件级防抖函数
	 */
	private getDebouncer(file: TFile): () => void {
		let fn = this.perFileDebouncers.get(file.path);
		if (!fn) {
			fn = debounce(() => {
				void this.processFile(file);
			}, 200);
			this.perFileDebouncers.set(file.path, fn);
		}
		return fn;
	}

	/**
	 * editor-change 回调
	 */
	onEditorChange(editor: Editor, info: MarkdownView | MarkdownFileInfo): void {
		const file = info.file;
		if (!file) {
			return;
		}
		this.getDebouncer(file)();
	}

	/**
	 * vault.modify 回调（覆盖外部程序修改文件的场景）
	 */
	onVaultModify(file: TFile): void {
		if (file.extension !== "md") {
			return;
		}
		this.getDebouncer(file)();
	}

	/**
	 * 文件重命名
	 */
	onVaultRename(file: TFile, oldPath: string): void {
		this.stats.renameFile(oldPath, file.path);
		const d = this.perFileDebouncers.get(oldPath);
		if (d) {
			this.perFileDebouncers.set(file.path, d);
			this.perFileDebouncers.delete(oldPath);
		}
	}

	/**
	 * 文件删除
	 */
	onVaultDelete(file: TFile): void {
		this.stats.deleteFile(file.path);
		this.perFileDebouncers.delete(file.path);
	}
}
