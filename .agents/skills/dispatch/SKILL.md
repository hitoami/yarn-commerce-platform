---
name: dispatch
description: Use when handing work to another agent on this repo (Orca worker, Codex subagent, spawned reviewer) or choosing which model should do a task. Covers pre-dispatch fact checks, hand-back carry-over, worker lifecycle and model routing.
---

# 派工清单

派工是为了并行杂活，不是为了拆开同一件事。页面与样式从视觉稿、实现到自查由一个 agent 完成，不拆给多个 agent（见 `docs/agents/visual-review.md`）。

## 派工前

- 涉及店铺状态（商品数、集合、语言、市场、配送、菜单）先用 `npm run admin` 查，把结果原样贴进任务；不凭印象写前提。
- 引用的文件、截图、URL 先确认存在；给 worker 的路径用它所在工作区能打开的绝对路径。
- 同一 Issue 的下一次派工，附上一轮 worker 交回的「剩余 / 限制」原文，并说明这次如何处理。
- 任务写清：Issue 号、要交回什么、怎么算完成、哪些动作需要先问（运营数据写入、发布、真实交易）。

## 派工与收尾（Orca）

- `worker-start` 带 `--task-title "<issue>-<slug>"`；要改代码用 `--worktree issue:<n>` 或 `new-child`，`current` 只用于只读任务。
- 等结果用一次 `check --wait`，不按检查点反复 `check`。
- worker 交回后立刻读结果，然后 `worker-stop` / `worker-release`；不留挂着的进程。
- 用户只在协调者终端说话；worker 窗格的插话会混进派工文本。

## 会话

- 一个 Issue 一个会话一个工作区；跨天或换任务前用 `/handoff` 留交接。
- 上下文压缩后，先重新打开当前 Issue 和相关视觉稿，再继续。
- 工具输出不整份读入：截图按视口、日志 `tail`、大文件按段读。

## 模型分工

- 高难度任务（出视觉稿、评审失控或改动滚雪球时收拾局面）交给最强模型；日常协调、规划、实现与对抗式代码评审用主力模型。
- 一行修复、配置调整、后台录入、截图与数据抓取等琐碎工作用便宜模型。
- 强模型不做高频评审或截图巡检；琐碎任务不开高难度模型。
