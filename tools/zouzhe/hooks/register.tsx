import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Memorial, Pressed, Status } from '../types'

// 御书房：把 hitoami 的每日提案（带「每日提案」标签的 GitHub Issue）按状态排成奏折匣：
// 待朱批 / 原型待批 / 承办中 / 已颁行 / 留中。准奏、驳回、再呈都发成一条消息，由会话按
// 仓库 .agents/skills/daily-proposal/SKILL.md 去办。
// 版式参考 Mobbin 上的看板（incident.io、Linear、Replit）：跟随深浅主题、细边框小卡片、操作在悬停或展阅里出现；
// 宫廷味只留在小印章上（准 / 成 / 驳 / 稿）。

const PANE = 'zouzhe'
const REPO = 'hitoami/yarn-commerce-platform'
const LABEL = '每日提案'
const APPROVED = '已准奏'
// 缓议（#294）：锦晨觉得不错、暂时没空做的奏折。只是 Issue 上的一个标签：不关闭、不进不做清单，每晚补足待批时不计入。
const SHELVED = '缓议'

const memorials = atom({ plugin: 'zouzhe', key: 'memorials' } as const, [], { shape: 'memorials-8' })
// 刚点过、GitHub 还没跟上的状态：按下准奏即进「承办中」，驳回即进「留中」。
const pressed = atom({ plugin: 'zouzhe', key: 'pressed' } as const, {} as Record<string, Pressed>, { shape: 'pressed-2' })
// 原型缩略图：大改出原型时把首屏截图存成 ~/.cache/hitoami-zouzhe/<编号>.jpg（宽 360、120KB 内），卡片上直接预览。
const thumbs = atom({ plugin: 'zouzhe', key: 'thumbs' } as const, {} as Record<string, string>)
const THUMB_DIR = '~/.cache/hitoami-zouzhe'
const rejecting = atom({ plugin: 'zouzhe', key: 'rejecting' } as const, null)
// 正在写迭代意见的原型奏折编号。
const revising = atom({ plugin: 'zouzhe', key: 'revising' } as const, null)
const loadedAt = atom({ plugin: 'zouzhe', key: 'loadedAt' } as const, '')
const drafting = atom({ plugin: 'zouzhe', key: 'drafting' } as const, false)
// 展阅中的奏折编号：有值时御书房面板整页显示这本奏折全文，像弹窗一样，点「回御书房」关掉。
const opened = atom({ plugin: 'zouzhe', key: 'opened' } as const, null)
// 底排「已颁行」「留中」默认折叠，点标题展开。
const unfolded = atom({ plugin: 'zouzhe', key: 'unfolded' } as const, {} as Record<string, boolean>)
// 卡片上刚发出的议事：会话回复并写进 Issue 评论后，刷新时以评论为准。
const asked = atom({ plugin: 'zouzhe', key: 'asked' } as const, {} as Record<string, string>)

// 准奏与拟奏都交给新会话（各自独立 worktree）去办，几本奏折可以同时进行；上线由 scripts/release.sh 的锁排队。
const NEW_SESSION = '请用 start_session（initiation "user_asked"，use_worktree true，context "fresh"）开一个新会话去办；开不了新会话时就在本会话里做。新会话的简报里写明下面的要求。'

// 颜色用主题色（text / inactive / subtle），只有状态点和印章用固定的中间色，深浅主题都看得清。
const VERMILION = '#c0392b'

type Column = { status: Status; title: string; strip: string; empty: string; limit: number }
// 上排三匣是要办的事；已颁行、留中放在最后一排，默认折叠。
const COLUMNS: Column[] = [
  { status: 'pending', title: '待朱批', strip: '#d9a21b', empty: '案上无折，天下太平', limit: 20 },
  { status: 'drafted', title: '原型待批', strip: '#c27c0e', empty: '暂无原型', limit: 20 },
  { status: 'doing', title: '承办中', strip: VERMILION, empty: '暂无', limit: 20 },
]
const ARCHIVE: Column[] = [
  { status: 'shelved', title: '缓议', strip: '#7d8fa3', empty: '暂无', limit: 30 },
  { status: 'done', title: '已颁行', strip: '#3e7c6b', empty: '暂无', limit: 12 },
  { status: 'rejected', title: '留中', strip: '#9a9187', empty: '暂无', limit: 12 },
]
const STATUS_LABEL: Record<Status, string> = { pending: '待朱批', drafted: '原型待批', doing: '承办中', done: '已颁行', rejected: '留中', shelved: '缓议' }


const seal = (mark: string, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">` +
  `<rect x="4" y="4" width="48" height="48" rx="5" fill="${color}" opacity="0.9" transform="rotate(-6 28 28)"/>` +
  `<rect x="8" y="8" width="40" height="40" rx="3" fill="none" stroke="#fffaf0" stroke-width="1.5" opacity="0.8" transform="rotate(-6 28 28)"/>` +
  `<text x="28" y="38" text-anchor="middle" font-size="27" font-weight="700" fill="#fffaf0" transform="rotate(-6 28 28)" ` +
  `font-family="Songti SC, STSong, Noto Serif SC, serif">${mark}</text></svg>`

// 圆形状态徽：原型待批的奏折用「稿」字圆印，和方形朱批印区分。
const roundSeal = (mark: string, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">` +
  `<circle cx="28" cy="28" r="25" fill="${color}"/><circle cx="28" cy="28" r="20.5" fill="none" stroke="#fffaf0" stroke-width="1.5" opacity="0.85"/>` +
  `<text x="28" y="37.5" text-anchor="middle" font-size="25" font-weight="700" fill="#fffaf0" font-family="Songti SC, STSong, Noto Serif SC, serif">${mark}</text></svg>`

// 原型缩略图：JPEG 包进 SVG，桌面面板按卡片宽度缩放。
const thumbSvg = (base64: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240">` +
  `<image href="data:image/jpeg;base64,${base64}" width="360" height="240" preserveAspectRatio="xMidYMin slice"/></svg>`

// 标题旁的「御」字小方印。
const EMBLEM =
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
  `<rect x="2" y="2" width="36" height="36" rx="5" fill="${VERMILION}"/>` +
  `<rect x="5.5" y="5.5" width="29" height="29" rx="3" fill="none" stroke="#fffaf0" stroke-width="1.2" opacity="0.75"/>` +
  `<text x="20" y="28" text-anchor="middle" font-size="20" font-weight="700" fill="#fffaf0" font-family="Songti SC, STSong, Noto Serif SC, serif">御</text></svg>`

const STAMPS: Partial<Record<Status, { mark: string; color: string }>> = {
  doing: { mark: '准', color: VERMILION },
  done: { mark: '成', color: '#3e7c6b' },
  rejected: { mark: '驳', color: '#8a8178' },
}

// 取出 Issue 正文里「**问题**：…」「**改成**：…」这样的段落，去掉 Markdown 记号，便于纯文字排版。
const section = (body: string, name: string) => {
  const match = body.match(new RegExp(`\\*\\*${name}\\*\\*[：:]([\\s\\S]*?)(?=\\n\\*\\*|\\nslack-ts|$)`))
  return (match?.[1] ?? '')
    .replace(/\*\*|`/g, '')
    .split('\n')
    .map(line => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean)
    .join('；')
}

// 面板只在空格处断行：在中日文字后插零宽空格，长标题才能在卡片里换行。
const soft = (text: string) => text.replace(/([\u2e80-\u9fff\u3000-\u303f\uff00-\uffef])/g, '$1\u200b')

// 卡片大小固定：标题和摘要按字数截短，全文在「展阅」里看。
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

type Issue = {
  number: number
  title: string
  body: string
  url: string
  updatedAt: string
  state: string
  stateReason: string
  labels: { name: string }[]
  comments: { body: string; createdAt: string }[]
}

// 每轮批阅 = 一条 Issue 评论：留最近 5 条，去掉 Markdown 记号；卡片显示最后一条的首句，展阅里显示全部。
const roundsOf = (issue: Issue) =>
  issue.comments.slice(-5).map(one => ({
    at: one.createdAt.slice(5, 10),
    text: one.body
      .replace(/\*\*|`|^#+\s*/gm, '')
      .split('\n')
      .map(line => line.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean)
      .join(' ')
      .slice(0, 400),
  }))

const statusOf = (issue: Issue): Status => {
  if (issue.state === 'CLOSED') return issue.stateReason === 'NOT_PLANNED' ? 'rejected' : 'done'
  if (issue.labels.some(label => label.name === APPROVED)) return 'doing'
  if (issue.labels.some(label => label.name === SHELVED)) return 'shelved'
  return issue.title.includes('原型待批') || /\*\*原型\*\*[：:]/.test(issue.body) ? 'drafted' : 'pending'
}

const toMemorial = (issue: Issue): Memorial => {
  const plain = issue.title.replace(/^\[每日提案[^\]]*\]\s*/, '')
  const [kind, ...rest] = plain.split(' · ')
  return {
    number: issue.number,
    title: rest.length ? rest.join(' · ') : plain,
    kind: rest.length && kind ? kind : '',
    problem: section(issue.body, '问题'),
    change: section(issue.body, '改成'),
    prototype: section(issue.body, '原型'),
    body: issue.body.replace(/\n*slack-ts:.*$/m, '').trim(),
    url: issue.url,
    status: statusOf(issue),
    updatedAt: issue.updatedAt,
    rounds: roundsOf(issue),
  }
}

async function refresh($: EngineInterface) {
  const { exitCode, stdout, stderr } = await $.process.run([
    'gh', 'issue', 'list', '--repo', REPO, '--label', LABEL, '--state', 'all',
    '--json', 'number,title,body,url,updatedAt,state,stateReason,labels,comments', '--limit', '40',
  ])
  if (exitCode !== 0) {
    $.ui.toast(`读取奏折失败：${stderr.trim().slice(0, 120)}`)
    return
  }
  const list = (JSON.parse(stdout) as Issue[]).map(toMemorial).sort((a, b) => b.number - a.number)
  await update($, memorials, () => list)
  // 按下之后 GitHub 上这本奏折有过任何更新（加标签、评论、关闭、改成原型待批），就以 GitHub 为准，丢掉本地暂记。
  await update($, pressed, all =>
    Object.fromEntries(Object.entries(all).filter(([n, p]) => {
      const m = list.find(one => one.number === Number(n))
      return m !== undefined && m.updatedAt < p.at
    })),
  )
  // 议事的回复已写进评论（Issue 在发问之后更新过），就不再显示本地暂记。
  await update($, asked, all =>
    Object.fromEntries(Object.entries(all).filter(([n, text]) => {
      const m = list.find(one => one.number === Number(n))
      return m !== undefined && m.updatedAt < (text.split('\u0000')[1] ?? '')
    })),
  )
  const shots = await $.process.run([
    'sh', '-c',
    `cd ${THUMB_DIR} 2>/dev/null || exit 0; for f in *.jpg; do [ -f "$f" ] && printf '%s %s\\n' "\${f%.jpg}" "$(base64 < "$f" | tr -d '\\n')"; done`,
  ])
  await update($, thumbs, () =>
    Object.fromEntries(shots.stdout.split('\n').filter(Boolean).map(line => line.split(' ') as [string, string])),
  )
  const now = new Date(await $.clock.now())
  await update($, loadedAt, () => `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
}

async function approveMemorial($: EngineInterface, m: Memorial) {
  const at = new Date(await $.clock.now()).toISOString()
  await update($, pressed, all => ({ ...all, [m.number]: { status: 'doing', at } }))
  await update($, opened, () => null)
  void $.prompt.submit({
    text: `【朱批·准奏】#${m.number}「${m.title}」（${m.kind || '提案'}）。这是锦晨在御书房面板上亲手点的「准奏」，等于在对话里对这个每日提案说「要」。${NEW_SESSION}` +
      `要求：在仓库 ${REPO}，先给 Issue #${m.number} 加「${APPROVED}」标签（有「${SHELVED}」标签就一并去掉）并评论「朱批：准（御书房）」，再按 .agents/skills/daily-proposal/SKILL.md 的「收到批阅」和「实现」处理：小改直接实现并上线，大改先出 Figma 原型重新呈上。`,
  })
  $.ui.toast(`#${m.number} 准奏，臣遵旨`)
}

// 缓议 / 取回：插件自己改 Issue 标签，不经过会话，点了立刻生效；GitHub 改失败就撤回本地暂记。
async function shelveMemorial($: EngineInterface, m: Memorial, shelve: boolean) {
  const at = new Date(await $.clock.now()).toISOString()
  const back: Status = m.kind.includes('原型待批') || m.prototype ? 'drafted' : 'pending'
  await update($, pressed, all => ({ ...all, [m.number]: { status: shelve ? 'shelved' : back, at } }))
  const { exitCode, stderr } = await $.process.run([
    'gh', 'issue', 'edit', String(m.number), '--repo', REPO, shelve ? '--add-label' : '--remove-label', SHELVED,
  ])
  if (exitCode !== 0) {
    await update($, pressed, all => Object.fromEntries(Object.entries(all).filter(([n]) => n !== String(m.number))))
    $.ui.toast(`#${m.number} 没改成：${stderr.trim().slice(0, 100)}`)
    return
  }
  $.ui.toast(shelve ? `#${m.number} 缓议，以后再办` : `#${m.number} 取回待批`)
  await refresh($)
}

async function rejectMemorial($: EngineInterface, m: Memorial, reason: string) {
  const at = new Date(await $.clock.now()).toISOString()
  await update($, pressed, all => ({ ...all, [m.number]: { status: 'rejected', at } }))
  await closeDetail($)
  void $.prompt.submit({
    text: `【朱批·驳回】#${m.number}「${m.title}」（${m.kind || '提案'}），理由：${reason}。这是锦晨在御书房面板上亲手驳回。` +
      `请按 .agents/skills/daily-proposal/SKILL.md：在 DESIGN.md「不做清单」加一行，Issue 评论理由并以 not planned 关闭。`,
  })
  $.ui.toast(`#${m.number} 留中不发`)
}

async function reviseMemorial($: EngineInterface, m: Memorial, note: string) {
  await closeDetail($)
  void $.prompt.submit({
    text: `【朱批·迭代】#${m.number}「${m.title}」的原型，皇上的意见：${note}。这是锦晨在御书房面板上亲手写的修改意见。` +
      `请按 .agents/skills/daily-proposal/SKILL.md「收到批阅」的「迭代」：照意见改原型，更新 Issue 的原型链接和缩略图，仍留在「原型待批」重新呈上，不实现。`,
  })
  $.ui.toast(`#${m.number} 发回重拟`)
}

// 卡片上的议事：只讨论，不改状态；会话把问答简记为 Issue 评论，卡片下方就显示为最新一轮。
async function discussMemorial($: EngineInterface, m: Memorial, text: string) {
  const at = new Date(await $.clock.now()).toISOString()
  await update($, asked, all => ({ ...all, [m.number]: `${text}\u0000${at}` }))
  void $.prompt.submit({
    text: `【御书房·议事】#${m.number}「${m.title}」（${STATUS_LABEL[m.status]}），锦晨在卡片上问：${text}。` +
      `请读 Issue #${m.number} 的正文和评论（需要时看代码或线上页面）后在对话里回答他；只讨论，不实现、不改奏折状态，除非他明说准奏或驳回。` +
      `答完在 Issue #${m.number} 加一条评论，第一行写「议事 · 问：<一句> / 答：<一句>」，御书房卡片会显示为最新一轮。`,
  })
  $.ui.toast(`#${m.number} 已奏对`)
}

async function openDetail($: EngineInterface, m: Memorial) {
  await update($, opened, () => m.number)
}

async function closeDetail($: EngineInterface) {
  await update($, opened, () => null)
  await update($, rejecting, () => null)
  await update($, revising, () => null)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'zouzhe', description: '摆驾御书房，批阅 hitoami 每日提案' })
    const started = await next(e)
    await refresh($)
    if ((await read($, memorials)).some(m => m.status === 'pending' || m.status === 'drafted')) void $.ui.open({ id: PANE, title: '御书房' })
    return started
  })

  on('command.run', { command: 'zouzhe' }, async $ => {
    await refresh($)
    await $.ui.open({ id: PANE, title: '御书房' })
    return { text: '摆驾御书房。' }
  })

  // 会话办完一件事（上线、关闭 Issue）后自动刷新奏折匣。
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) await refresh($)
    return done
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button, Link, Markdown } = ui
    // 桌面版有输入框和印章；终端等其他界面退回纯文字。
    const Svg = 'Svg' in ui ? ui.Svg : null
    const Input = 'Input' in ui ? ui.Input : null
    const list = await read($, memorials)
    const local = await read($, pressed)
    const writing = await read($, rejecting)
    const noting = await read($, revising)
    const at = await read($, loadedAt)
    const isDrafting = await read($, drafting)
    const shots = await read($, thumbs)
    const openNumber = await read($, opened)
    const open = await read($, unfolded)
    const askedMap = await read($, asked)
    const status = (m: Memorial): Status => local[m.number]?.status ?? m.status
    const shown = openNumber === null ? undefined : list.find(m => m.number === openNumber)
    const count = (s: Status) => list.filter(m => status(m) === s).length
    const waitingOf = (m: Memorial) => askedMap[String(m.number)]?.split('\u0000')[0]
    const isOpenStatus = (s: Status) => s === 'pending' || s === 'drafted'
    // 能批的：待批两种，加上缓议（缓议的也能直接准奏、驳回或取回）。
    const isActionable = (s: Status) => isOpenStatus(s) || s === 'shelved'

    const draft = async (idea: string) => {
      await update($, drafting, () => false)
      const ask = idea
        ? `按这个想法拟一本：${idea}`
        : '自拟一本：按 skill 的「锦晨喜欢的方向」和「找想法」，先从商品数据出发，出一本像手感地图那样过五条自查的大方向，避开已有奏折和「不做清单」'
      void $.prompt.submit({
        text: `【圣旨·拟奏】${ask}。${NEW_SESSION}要求：在仓库 ${REPO}，按 .agents/skills/daily-proposal/SKILL.md 的「找想法」「分大小」和「Issue 格式」开一个「每日提案」Issue，只呈奏折，不实现。`,
      })
      $.ui.toast(idea ? '领旨，臣这就拟奏' : '臣斗胆自拟一本')
    }

    const talkInput = (m: Memorial, where: string) =>
      Input && (
        <Input
          key={`talk-${where}-${m.number}-${(askedMap[String(m.number)] ?? '').length}`}
          placeholder="议一议：问一句、提个想法，回车发出"
          submitLabel="奏对"
          onSubmit={(value: string) => value.trim() && discussMemorial($, m, value.trim())}
        />
      )

    // 朱批按钮：准奏是主按钮，其余是原生次要按钮（跟随主题，不再自己垫底色）。
    const actions = (m: Memorial, where: string) => {
      const now = status(m)
      if (!isActionable(now)) return null
      return (
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          <Button key={`yes-${where}-${m.number}`} label="准奏" variant="primary" onPress={() => approveMemorial($, m)} />
          {now === 'shelved' ? (
            <Button key={`back-${where}-${m.number}`} label="取回待批" variant="secondary" onPress={() => shelveMemorial($, m, false)} />
          ) : (
            <Button key={`shelve-${where}-${m.number}`} label="缓议" variant="secondary" onPress={() => shelveMemorial($, m, true)} />
          )}
          <Button
            key={`no-${where}-${m.number}`}
            label="驳回"
            variant="secondary"
            onPress={async () => {
              if (!Input) return rejectMemorial($, m, '未写理由，请在对话里问我')
              await update($, rejecting, () => m.number)
              await openDetail($, m)
            }}
          />
          {now === 'drafted' && Input && (
            <Button
              key={`again-${where}-${m.number}`}
              label="迭代"
              variant="secondary"
              onPress={async () => {
                await update($, revising, () => m.number)
                await openDetail($, m)
              }}
            />
          )}
        </Box>
      )
    }

    const meta = (m: Memorial) => {
      const now = status(m)
      const kind = m.kind.replace(/（.*）/, '')
      return (
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={1} minWidth={0}>
          <Text size="caption" color="inactive" tabular wrap="truncate">
            #{m.number}{kind ? ` · ${kind}` : ''}
          </Text>
          {Svg && STAMPS[now] && <Svg source={seal(STAMPS[now].mark, STAMPS[now].color)} alt={`朱批：${STAMPS[now].mark}`} width={20} height={20} />}
          {Svg && now === 'drafted' && <Svg source={roundSeal('稿', '#c27c0e')} alt="原型待批" width={20} height={20} />}
        </Box>
      )
    }

    // 展阅：整页显示奏折全文、每轮批阅与议事，批阅按钮常驻。
    if (shown) {
      const m = shown
      const now = status(m)
      const waiting = waitingOf(m)
      return (
        <Box flexDirection="column" gap={2} padding={2}>
          <Box flexDirection="row">
            <Button key="back" label="← 回御书房" variant="secondary" onPress={() => closeDetail($)} />
          </Box>
          <Box flexDirection="column" gap={1}>
            <Text size="footnote" color="inactive">
              奏折 #{m.number}{m.kind ? ` · ${m.kind}` : ''} · {STATUS_LABEL[now]}
            </Text>
            <Box flexDirection="row" alignItems="flex-start" gap={2}>
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                <Text size="title" weight="bold" wrap="wrap">{soft(m.title)}</Text>
              </Box>
              {Svg && STAMPS[now] && <Svg source={seal(STAMPS[now].mark, STAMPS[now].color)} alt={`朱批：${STAMPS[now].mark}`} width={40} height={40} />}
            </Box>
          </Box>
          {isActionable(now) &&
            (noting === m.number && Input ? (
              <Input
                key={`note-detail-${m.number}`}
                label="迭代意见（照此改原型，再呈上）"
                placeholder="例如：线球再大一点，手机上一屏放不下就分页"
                submitLabel="发回重拟"
                rows={3}
                autoFocus
                onSubmit={(value: string) => value.trim() && reviseMemorial($, m, value.trim())}
              />
            ) : writing === m.number && Input ? (
              <Input
                key={`why-detail-${m.number}`}
                label="驳回之由（记入不做清单）"
                placeholder="例如：此事容后再议"
                submitLabel="朱批驳回"
                autoFocus
                onSubmit={(value: string) => value.trim() && rejectMemorial($, m, value.trim())}
              />
            ) : (
              actions(m, 'detail')
            ))}
          <Box flexDirection="row" gap={2} flexWrap="wrap">
            {m.prototype && <Link href={m.prototype} label="看原型" />}
            <Link href={m.url} label={`在 GitHub 打开 #${m.number}`} />
          </Box>
          <Markdown key={`body-${m.number}`} text={m.body || '（奏折无正文）'} />
          <Box flexDirection="column" gap={1} paddingTop={1}>
            <Text weight="bold">批阅与议事</Text>
            {m.rounds.length === 0 && !waiting && <Text size="footnote" color="inactive">还没有批注。</Text>}
            {m.rounds.map((round, index) => (
              <Box key={`round-${m.number}-${index}`} flexDirection="column" paddingX={1} paddingY={1} borderStyle="round" borderColor="subtle">
                <Text size="caption" color="inactive" tabular>{round.at}</Text>
                <Text size="footnote" wrap="wrap">{soft(clip(round.text, 220))}</Text>
              </Box>
            ))}
            {waiting && (
              <Box flexDirection="column" paddingX={1} paddingY={1} borderStyle="round" borderColor="claude">
                <Text size="caption" color="claude">刚刚 · 待回复</Text>
                <Text size="footnote" wrap="wrap">{soft(waiting)}</Text>
              </Box>
            )}
            {talkInput(m, 'detail')}
          </Box>
        </Box>
      )
    }

    // 卡片：编号与大小一行、标题（点开展阅）、一句摘要、最新一轮；准奏 / 驳回 / 议事在鼠标移上去时出现。
    const card = (m: Memorial) => {
      const now = status(m)
      const scope = `card-${m.number}`
      const shot = now === 'drafted' ? shots[String(m.number)] : undefined
      const waiting = waitingOf(m)
      const last = m.rounds.at(-1)
      const latest = waiting ? `问：${waiting}（待回复）` : last ? `${last.at} · ${last.text}` : ''
      return (
        <Box
          key={`m-${m.number}`}
          flexDirection="column"
          gap={1}
          paddingX={2}
          paddingY={1}
          minWidth={0}
          borderStyle="round"
          borderColor="subtle"
          hover={{ scope, borderColor: 'claude' }}
        >
          {meta(m)}
          <Button key={`title-${m.number}`} plain onPress={() => openDetail($, m)}>
            <Text weight="semibold" wrap="wrap">{soft(clip(m.title, 40))}</Text>
          </Button>
          {shot && Svg && <Svg key={`shot-${m.number}`} source={thumbSvg(shot)} alt={`#${m.number} 原型首屏`} />}
          {!shot && isOpenStatus(now) && m.problem && (
            <Text size="footnote" color="inactive" wrap="wrap">{soft(clip(m.problem, 44))}</Text>
          )}
          {latest && (
            <Text size="caption" color={waiting ? 'claude' : 'inactive'} wrap="wrap">
              {soft(`↳ ${clip(latest, 48)}`)}
            </Text>
          )}
          <Box flexDirection="column" gap={1} display="none" hover={{ scope, display: 'flex' }}>
            {actions(m, 'card')}
            {talkInput(m, 'card')}
          </Box>
        </Box>
      )
    }

    const lane = (column: Column) => {
      const cards = list.filter(m => status(m) === column.status)
      return (
        <Box key={`col-${column.status}`} flexDirection="column" gap={1} flexGrow={1} flexShrink={1} width="33%" minWidth={30}>
          <Box flexDirection="row" alignItems="center" gap={1} paddingX={1}>
            <Text color={column.strip}>●</Text>
            <Text weight="semibold">{column.title}</Text>
            <Text color="inactive" tabular>{cards.length}</Text>
          </Box>
          {cards.length === 0 && (
            <Box paddingX={2} paddingY={1} borderStyle="dashed" borderColor="subtle">
              <Text size="footnote" color="inactive">{column.empty}</Text>
            </Box>
          )}
          {cards.slice(0, column.limit).map(card)}
          {cards.length > column.limit && <Text size="caption" color="inactive">另有 {cards.length - column.limit} 本</Text>}
        </Box>
      )
    }

    // 缓议、已颁行、留中：折叠成一行，展开是一列紧凑清单（编号 + 标题 + 日期），点标题展阅；缓议的每行可直接取回。
    const archive = (column: Column) => {
      const rows = list.filter(m => status(m) === column.status)
      const expanded = open[column.status] === true
      return (
        <Box key={`arch-${column.status}`} flexDirection="column" gap={0} flexGrow={1} flexShrink={1} width={`${Math.floor(100 / ARCHIVE.length)}%`} minWidth={30}>
          <Button
            key={`fold-${column.status}`}
            plain
            onPress={() => update($, unfolded, all => ({ ...all, [column.status]: !expanded }))}
          >
            <Text color="inactive">{expanded ? '▾ ' : '▸ '}</Text>
            <Text color={column.strip}>● </Text>
            <Text weight="semibold">{column.title} </Text>
            <Text color="inactive" tabular>{rows.length}</Text>
          </Button>
          {expanded &&
            rows.slice(0, column.limit).map(m => (
              <Box key={`row-${m.number}`} flexDirection="row" alignItems="center" gap={1} paddingX={1} minWidth={0}>
                <Text size="caption" color="inactive" tabular>#{m.number}</Text>
                <Box flexGrow={1} flexShrink={1} minWidth={0}>
                  <Button key={`row-open-${m.number}`} plain onPress={() => openDetail($, m)}>
                    <Text size="footnote" color={column.status === 'rejected' ? 'inactive' : 'text'} strikethrough={column.status === 'rejected'} wrap="truncate">
                      {clip(m.title, 30)}
                    </Text>
                  </Button>
                </Box>
                {column.status === 'shelved' ? (
                  <Button key={`row-back-${m.number}`} label="取回" variant="secondary" onPress={() => shelveMemorial($, m, false)} />
                ) : (
                  <Text size="caption" color="inactive" tabular>{m.updatedAt.slice(5, 10)}</Text>
                )}
              </Box>
            ))}
          {expanded && rows.length > column.limit && (
            <Text size="caption" color="inactive">另有 {rows.length - column.limit} 本，在 GitHub 看</Text>
          )}
        </Box>
      )
    }

    const pendingCount = count('pending') + count('drafted')
    return (
      <Box flexDirection="column" gap={2} padding={2}>
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
          <Box flexDirection="row" alignItems="center" gap={2}>
            {Svg && <Svg source={EMBLEM} alt="御书房印" width={32} height={32} />}
            <Box flexDirection="column">
              <Text size="title" weight="bold">御书房</Text>
              <Text size="footnote" color="inactive">
                {pendingCount ? `${pendingCount} 本待朱批` : '案牍已清'}
                {at ? ` · ${at} 更新` : ''}
              </Text>
            </Box>
          </Box>
          <Box flexDirection="row" gap={1}>
            <Button key="reload" label="刷新" variant="secondary" onPress={() => refresh($)} />
            <Button key="draft" label={isDrafting ? '收回' : '拟一本'} variant="primary" onPress={() => (Input ? update($, drafting, was => !was) : draft(''))} />
          </Box>
        </Box>

        {isDrafting && Input && (
          <Box flexDirection="column" gap={1} paddingX={2} paddingY={1} borderStyle="round" borderColor="claude">
            <Text weight="semibold">下旨拟奏</Text>
            <Text size="footnote" color="inactive" wrap="wrap">
              {soft('写下想法，臣据此拟一本；留空直接回车，臣自寻一题。拟好的会出现在「待朱批」。')}
            </Text>
            <Input key="idea" placeholder="例如：首页手机首屏想更快看到毛线" submitLabel="下旨" rows={2} autoFocus onSubmit={(value: string) => draft(value.trim())} />
          </Box>
        )}

        {/* 三条泳道；面板窄（手机）时折行成上下排。 */}
        <Box flexDirection="row" flexWrap="wrap" gap={2} alignItems="flex-start">
          {COLUMNS.map(lane)}
        </Box>

        <Box flexDirection="row" flexWrap="wrap" gap={2} alignItems="flex-start" paddingTop={1}>
          {ARCHIVE.map(archive)}
        </Box>
      </Box>
    )
  })
}
