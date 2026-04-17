# 字数热力图 · Word Heatmap

> 以 GitHub 风格热力图展示每日写作字数的 Obsidian 插件。
>
> A GitHub-style contribution heatmap for your daily writing in Obsidian.

![热力图预览](attachment/preview.png)

## 功能

- **实时统计**：输入一个字即计入当天，删除一个字即减去，精确追踪每日写作量
- **中英文混合**：中文按字符计数，英文按单词计数
- **智能过滤**：自动排除代码块、frontmatter、Markdown 语法标记，只统计正文内容
- **侧边栏视图**：左侧 ribbon 图标一键打开，展示完整热力图 + 今日字数 + 进度条 + 连续写作天数
- **状态栏显示**：底部状态栏实时显示今日字数，点击可打开侧边栏
- **点击查看明细**：点击热力图格子，展示当日编辑的文件名和字数，点击文件名可跳转打开
- **代码块内嵌**：在任意笔记中插入 `word-heatmap` 代码块，即可内嵌热力图
- **每日目标**：设置目标字数后显示进度条，达标格子有特殊边框标识
- **连续写作天数**：显示当前连续天数和历史最长记录
- **数据导出**：一键导出 CSV，Excel 打开中文不乱码
- **排除特定文件**：在文件 frontmatter 中加入自定义标识字段即可排除统计（字段名可配置）

## ToDo List

- [ ] 添加月视图、日视图
- [ ] 美化 UI 显示
- [ ] 修改安装方式，兼容 BRAT（上架官方插件市场）
- [ ] 支持多种热力图主题（经典绿、暖橙、冷蓝等）
- [ ] 首页总览：累计字数、最高产日、写作节奏分析
- [ ] 周报 / 月报 自动生成
- [ ] 支持按文件夹分别统计多张热力图
- [ ] 国际化（英文界面）

## 安装

1. 下载最新版本的 `main.js`、`styles.css`、`manifest.json`
2. 在 vault 目录下创建 `.obsidian/plugins/word-heatmap/` 文件夹
3. 将三个文件复制到该文件夹
4. 在 Obsidian 设置 → 第三方插件 中启用「字数热力图 (Word Heatmap)」

## 使用

### 侧边栏视图

点击左侧 ribbon 的火焰图标，或通过命令面板执行「打开写作统计面板」。

### 代码块内嵌

在笔记中插入以下代码块：

````
```word-heatmap
title: 我的写作统计
days: 365
```
````

支持的参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `title` | 图表标题 | 写作统计 |
| `days` | 展示天数 | 365 |
| `startOfWeek` | 每周起始日（0=周日，1=周一） | 1 |

### 排除特定文件

对于剪藏、收藏、模板等不想计入统计的文件，在文件头部的 frontmatter 中加入：

```yaml
---
word-heatmap-exclude: true
---
```

字段名默认为 `word-heatmap-exclude`，可在设置中改成你喜欢的名称（例如 `skip-count`、`不统计` 等）。

### 数据导出

命令面板执行「导出写作统计为 CSV」，导出文件包含日期、总字数、是否达标、各文件明细。

## 设置

| 设置项 | 说明 |
|--------|------|
| 默认展示天数 | 热力图默认时间范围 |
| 默认标题 | 热力图标题文字 |
| 每周起始日 | 周日或周一开始 |
| 显示图例 | 热力图下方的颜色等级指示条 |
| 仅统计指定文件夹 | 留空统计全部，多个文件夹用逗号分隔 |
| 排除文件字段名 | frontmatter 中用于标识排除的字段名 |
| 数据保留天数 | 超过后自动清理旧数据 |
| 每日目标字数 | 设为 0 关闭目标功能 |
| 颜色分级规则 | 自定义字数区间和对应颜色 |

## 统计规则

- 只统计 `.md` 文件
- 以下内容**不计入**字数：
  - YAML frontmatter（`---` 块）
  - 围栏代码块（` ``` `）和行内代码（`` ` ``）
  - 图片、链接语法（链接文字计入）
  - 标题标记（`#`）、加粗/斜体标记（`**`、`_`）
  - 列表标记、引用标记（`>`）、HTML 标签
- 标记为排除的文件完全不参与统计

## 数据存储

写作数据保存在插件的 `data.json` 文件中（位于 `.obsidian/plugins/word-heatmap/data.json`），不会修改任何笔记文件。

## 开发

```bash
git clone <repo>
npm install
npm run dev    # 开发模式（监听文件变化）
npm run build  # 生产构建
```

## 致谢

项目思路来自于 [obsidian-daily-heatmap](https://github.com/deutdrsium/obsidian-daily-heatmap)

热力图渲染层参考了 [obsidian-contribution-graph](https://github.com/vran-dev/obsidian-contribution-graph) 的实现。

代码由 Claude 4.7 Opus 辅助生成。
