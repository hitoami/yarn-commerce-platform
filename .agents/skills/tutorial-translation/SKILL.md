---
name: tutorial-translation
description: Use when turning a Chinese knitting / crochet tutorial video (e.g. a Xiaohongshu screen recording) into a Japanese PDF guide with screenshots — frame extraction, transcription, terminology-checked translation, PDF layout and review checklist.
---

# 中文编织视频 → 日文 PDF 教程

目标是让日本读者照着 PDF 能钩/织出来。准确优先于通顺：针法名、段数、针数错一个就做不出来。

## 0. 准备

- 素材由用户提供视频文件（屏幕录制即可），不从平台抓取。
- 过程文件全部放 `output/tutorials/<slug>/`（已被 git 忽略）：帧、音频、字幕、HTML、PDF 都不提交。
- 工具：`ffmpeg`（已装）；语音转文字用 `mlx-whisper`，装在临时虚拟环境里，不加进项目依赖：
  `python3 -m venv <dir>/venv && <dir>/venv/bin/pip install mlx-whisper`

## 1. 拆视频

1. `ffprobe` 看时长和分辨率。
2. 每 3 秒抽一帧（`fps=1/3,scale=402:-2`），拼成 6×2 缩略图总览（`tile=6x2`），先看懂整体结构：材料介绍 → 各步骤 → 结尾编织图。
3. 关键画面（材料、每步动作完成时、编织图）用 `-ss <秒>` 重新抽**原分辨率**单帧。编织图通常在视频最后几秒。
4. 截图裁掉平台界面（头像、点赞栏、标题），只保留手部动作或图解。

## 2. 取文字

- 画面内字幕：直接看帧读取。
- 语音：先 `ffmpeg -i <视频> -ac 1 -ar 16000 audio.wav`，再
  `mlx_whisper audio.wav --model mlx-community/whisper-large-v3-turbo --language zh --condition-on-previous-text False`。
  **不要加 `--initial-prompt`**：实测会让输出卡死在重复字（「针针针…」）。
- 转写结果会混入繁体字和同音错字（如「勾芝」= 钩织、「翻斬支片」= 翻转织片），也可能在结尾凭空生成「请点赞订阅」之类的句子。以画面字幕为准逐句校对，删掉幻听内容。
- 字幕、语音、编织图三者不一致时，不擅自选一个，照译并记入审校要点。

## 3. 整理成步骤（先写中文）

- 把口语改成可操作的步骤：每步写明 **第几段、用什么颜色、钩/织什么针法、钩入哪里、重复规则**。
- 「这里绕一下」「同样操作」这类说法，按画面和编织图补全。
- 和编织图交叉核对：针法、重复单位（如「4 的倍数 + 2」）、换色位置。

## 4. 翻译成日文

- 针法和计数**必须**查 `references/glossary.md`；表里没有的词标「?」并补进对照表。
- 文体：です・ます调，简洁，不用网络语和表情。
- 计数用日文写法：行/圈 → 段，针 → 目，「重复」→「くり返す」。
- 规格写 mm 和日本号数，例如「3.5mm（6/0号）」。
- 商品名、品牌名、色名保留原文，旁边附日文说明。

## 5. 排版成 PDF

- 用 HTML 排版（A4 竖版，`@page { size: A4 }`，日文字体用 Hiragino Sans，中文对照用 PingFang SC），图片用相对路径和 HTML 放在同一目录。
- 导出：`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf=<out>.pdf file://<abs>/index.html`。
- 截图裁剪：竖屏录屏去掉顶部通知栏、底部字幕和平台栏（示例：1206×2300 的录屏用 `crop=1206:1120:0:260`），注意别把私人通知截进去。
- 每步：截图 + 日文说明 + 小字中文对照（供不懂日文的内部人员核对）。
- 结构：标题 → 材料与工具 → 编织图和符号说明 → 步骤 → 「审校要点」（所有带「?」的词和不确定的地方）。

## 6. 审校清单

- [ ] 每个针法名都能在对照表里找到，或已标「?」
- [ ] 下针/上针、短针/細編み、行/段 没有按字面直译
- [ ] 段数、针数、重复规则和编织图一致
- [ ] 截图里没有平台界面和别人的头像
- [ ] 交付前请懂编织的日语母语者看一遍；确认后的用词更新到对照表
