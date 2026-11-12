# 御书房（zouzhe）

Claude Code 插件：把带「每日提案」标签的 GitHub Issue 排成看板，在面板上准奏、驳回、迭代、议事。流程见 `.agents/skills/daily-proposal/SKILL.md`。

看板上排是待朱批、原型待批、承办中；最后一排是缓议、已颁行、留中，默认折叠。卡片上的「缓议」把不错但暂时没空做的想法先留着（给 Issue 加 `缓议` 标签），之后在缓议匣里「取回」或直接准奏。

## 安装（每台电脑一次）

需要能访问 `hitoami/yarn-commerce-platform` 这个私有仓库，并且本机 `gh` 已登录。

- 桌面 app：点输入框旁的 +，选 Plugins → Add marketplace，填 `hitoami/yarn-commerce-platform`，再添加 `zouzhe`。
- 终端：

```bash
claude plugin install zouzhe --marketplace hitoami/yarn-commerce-platform
```

装好后，新会话里输入 `/zouzhe` 打开面板。

## 更新

改了 `tools/zouzhe/` 要提交并推到 `main`，然后各自运行：

```bash
claude plugin update zouzhe
```

## 开发

- 面板跟随 app 的深浅主题，不要写死浅色底（原生按钮在深色主题下是浅色字）。
- 校验和测试：`claude plugin validate tools/zouzhe`、`claude plugin test tools/zouzhe`。
