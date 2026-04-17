// 每日字数统计数据管理
// 负责：数据结构维护、持久化、变更通知、文件明细查询

import { App, TFile } from "obsidian";
import { Contribution, ContributionItem, DailyData, DailyStatsData, PluginSettings } from "../types";
import { today, toFormattedDate } from "../util/dateUtils";
import { countFileWords, isFileExcluded } from "./wordCounter";
import { debounce } from "../util/utils";

// 持久化数据的外层结构
export interface PersistedData {
	// 每日写作数据
	daily: DailyStatsData;
	// 最后一次全量扫描时间戳，用于判断是否需要重新扫描
	lastScanTime: number;
	// 设置项
	settings?: PluginSettings;
}

export type DailyStatsChangeCallback = () => void;

export class DailyStatsManager {
	private app: App;
	// 每日字数数据
	private data: DailyStatsData = {};
	// 内存中各文件的上次字数快照（用于计算差值）
	private fileSnapshots: Map<string, number> = new Map();
	// 数据变更回调列表
	private changeCallbacks: Set<DailyStatsChangeCallback> = new Set();
	// 防抖保存函数，由外部注入实际的 saveData 调用
	private saveFn: (() => Promise<void>) | null = null;
	// 防抖触发
	public debouncedSave: () => void;
	// 最后一次扫描时间
	private lastScanTime = 0;

	constructor(app: App) {
		this.app = app;
		// 2 秒防抖保存
		this.debouncedSave = debounce(() => {
			if (this.saveFn) {
				void this.saveFn();
			}
		}, 2000);
	}

	/**
	 * 初始化：加载持久化数据
	 */
	load(persisted: PersistedData | null | undefined): void {
		if (persisted && persisted.daily) {
			this.data = persisted.daily;
			this.lastScanTime = persisted.lastScanTime || 0;
		} else {
			this.data = {};
			this.lastScanTime = 0;
		}
	}

	/**
	 * 设置持久化保存函数
	 */
	setSaveFn(fn: () => Promise<void>): void {
		this.saveFn = fn;
	}

	/**
	 * 立即保存（跳过防抖），用于 onunload
	 */
	async flushSave(): Promise<void> {
		if (this.saveFn) {
			await this.saveFn();
		}
	}

	/**
	 * 获取持久化数据
	 */
	getPersistedData(): { daily: DailyStatsData; lastScanTime: number } {
		return {
			daily: this.data,
			lastScanTime: this.lastScanTime,
		};
	}

	/**
	 * 注册数据变更回调
	 */
	onChange(cb: DailyStatsChangeCallback): () => void {
		this.changeCallbacks.add(cb);
		return () => this.changeCallbacks.delete(cb);
	}

	private notifyChange(): void {
		this.changeCallbacks.forEach((cb) => {
			try {
				cb();
			} catch (e) {
				console.error("字数热力图：回调执行出错", e);
			}
		});
	}

	/**
	 * 更新某个文件在某天的字数变化
	 */
	updateFileCount(date: string, filePath: string, delta: number): void {
		if (delta === 0) {
			return;
		}
		let day = this.data[date];
		if (!day) {
			day = { total: 0, files: {} };
			this.data[date] = day;
		}
		day.total += delta;
		if (day.total < 0) {
			day.total = 0;
		}
		const cur = day.files[filePath] || 0;
		const next = cur + delta;
		if (next <= 0) {
			delete day.files[filePath];
		} else {
			day.files[filePath] = next;
		}
		this.debouncedSave();
		this.notifyChange();
	}

	/**
	 * 获取文件字数快照（用于 editor extension 差值计算）
	 */
	getFileSnapshot(filePath: string): number | undefined {
		return this.fileSnapshots.get(filePath);
	}

	setFileSnapshot(filePath: string, count: number): void {
		this.fileSnapshots.set(filePath, count);
	}

	removeFileSnapshot(filePath: string): void {
		this.fileSnapshots.delete(filePath);
	}

	/**
	 * 文件重命名：迁移快照和历史数据中的文件路径
	 */
	renameFile(oldPath: string, newPath: string): void {
		const snap = this.fileSnapshots.get(oldPath);
		if (snap !== undefined) {
			this.fileSnapshots.set(newPath, snap);
			this.fileSnapshots.delete(oldPath);
		}
		for (const date in this.data) {
			const files = this.data[date].files;
			if (oldPath in files) {
				files[newPath] = (files[newPath] || 0) + files[oldPath];
				delete files[oldPath];
			}
		}
		this.debouncedSave();
	}

	/**
	 * 文件删除：保留历史数据但清除当前快照
	 */
	deleteFile(filePath: string): void {
		this.fileSnapshots.delete(filePath);
	}

	/**
	 * 获取今日字数
	 */
	getTodayTotal(): number {
		return this.data[today()]?.total || 0;
	}

	/**
	 * 获取指定日期的字数
	 */
	getDateTotal(date: string): number {
		return this.data[date]?.total || 0;
	}

	/**
	 * 返回完整的每日数据（只读引用，请勿直接修改）
	 */
	getAllData(): DailyStatsData {
		return this.data;
	}

	/**
	 * 获取最近 N 天的贡献数据，供渲染层使用
	 */
	getContributions(days: number): Contribution[] {
		const result: Contribution[] = [];
		const now = new Date();
		for (let i = 0; i < days; i++) {
			const d = new Date(now);
			d.setDate(now.getDate() - i);
			const dateStr = toFormattedDate(d);
			const day = this.data[dateStr];
			if (day && day.total > 0) {
				result.push({
					date: dateStr,
					value: day.total,
					items: this.buildItems(day),
				});
			}
		}
		return result;
	}

	/**
	 * 构建当日文件明细（按字数降序）
	 */
	private buildItems(day: DailyData): ContributionItem[] {
		const entries = Object.entries(day.files).sort((a, b) => b[1] - a[1]);
		return entries.map(([path, count]) => {
			const fileName = path.split("/").pop() || path;
			return {
				label: `${fileName} — ${count} 字`,
				value: count,
				link: {
					href: path,
					className: "internal-link",
				},
			};
		});
	}

	/**
	 * 获取某日的文件明细（供侧边栏点击展示使用）
	 */
	getFileDetails(date: string): ContributionItem[] {
		const day = this.data[date];
		if (!day) {
			return [];
		}
		return this.buildItems(day);
	}

	/**
	 * 清理超过保留天数的数据
	 */
	cleanupOldData(retentionDays: number): void {
		if (retentionDays <= 0) {
			return;
		}
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - retentionDays);
		const cutoffStr = toFormattedDate(cutoff);
		let changed = false;
		for (const date in this.data) {
			if (date < cutoffStr) {
				delete this.data[date];
				changed = true;
			}
		}
		if (changed) {
			this.debouncedSave();
		}
	}

	/**
	 * 首次安装时全量扫描 vault，建立基准数据
	 * 按文件修改时间归属到对应日期
	 */
	async initialScan(
		files: TFile[],
		includeFolders: string,
		excludeField: string,
		onProgress?: (done: number, total: number) => void
	): Promise<void> {
		const folders = includeFolders
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		const filtered = folders.length === 0
			? files
			: files.filter((f) => folders.some((p) => f.path.startsWith(p)));

		const batchSize = 50;
		for (let i = 0; i < filtered.length; i += batchSize) {
			const batch = filtered.slice(i, i + batchSize);
			await Promise.all(
				batch.map(async (file) => {
					try {
						const content = await this.app.vault.cachedRead(file);
						if (isFileExcluded(content, excludeField)) return;
						const count = countFileWords(content);
						if (count > 0) {
							const mdate = toFormattedDate(new Date(file.stat.mtime));
							let day = this.data[mdate];
							if (!day) {
								day = { total: 0, files: {} };
								this.data[mdate] = day;
							}
							// 初始化：直接赋值而非累加，避免重复扫描重复计数
							const prev = day.files[file.path] || 0;
							day.total = day.total - prev + count;
							day.files[file.path] = count;
						}
						this.fileSnapshots.set(file.path, count);
					} catch (e) {
						console.error("字数热力图：扫描文件出错 " + file.path, e);
					}
				})
			);
			onProgress?.(Math.min(i + batchSize, filtered.length), filtered.length);
			// 让出主线程
			await new Promise((r) => setTimeout(r, 0));
		}

		this.lastScanTime = Date.now();
		this.debouncedSave();
		this.notifyChange();
	}

	/**
	 * 判断是否需要首次扫描
	 */
	needsInitialScan(): boolean {
		return this.lastScanTime === 0;
	}
}
