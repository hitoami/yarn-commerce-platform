import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'zouzhe',
  component: 'Pane',
  requestId: 'zouzhe',
  props: { title: '御书房', isFocused: false, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} },
} as const

const issue = (number: number, title: string, extra: Record<string, unknown> = {}) => ({
  number, title, url: `https://github.com/x/y/issues/${number}`, updatedAt: '2026-10-30T10:00:00Z', state: 'OPEN', stateReason: '',
  labels: [], body: '**问题**：首屏不够吸引人。\n**改成**：圆点换成标签。', comments: [], ...extra,
})
const ISSUES = [
  issue(274, '[每日提案] 小改 · 首屏三张图露出名字'),
  issue(242, '[每日提案] 大改（原型待批） · 配色试织台', { comments: [{ body: '方向已准，原型呈上待二次朱批', createdAt: '2026-10-30T09:00:00Z' }] }),
  issue(265, '[每日提案] 小改 · 首页分区节奏', { state: 'CLOSED', stateReason: 'COMPLETED' }),
  issue(256, '[每日提案] 大改 · 小猫边滚边织', { state: 'CLOSED', stateReason: 'NOT_PLANNED' }),
]

test('the board draws three lanes, a folded archive, and opens a memorial', async ($, on) => {
  on('command.register', () => ({ value: { command: 'zouzhe' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => ({ value: { exitCode: 0, stdout: e.argv[0] === 'gh' ? JSON.stringify(ISSUES) : '', stderr: '' } as never }))
  on('clock.now', () => ({ value: Date.parse('2026-10-30T12:00:00Z') }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    // Titles carry zero-width spaces so CJK can wrap; compare without them.
    const has = async (words: string) =>
      (await ui.findAll({ type: 'Text' })).some((t: { text?: string }) => (t.text ?? '').replace(/\u200b/g, '').includes(words))
    expect(await has('2 本待朱批')).toBe(true)
    expect(await has('方向已准')).toBe(true)
    // Archive is folded: its title shows, its rows do not.
    expect(await has('小猫边滚边织')).toBe(false)
    await ui.press({ key: 'fold-rejected' })
    expect(await has('小猫边滚边织')).toBe(true)
    await ui.press({ key: 'title-274' })
    expect(await has('批阅与议事')).toBe(true)
    await ui.press({ key: 'back' })
    await ui.press({ key: 'fold-rejected' })
    await ui.unmount()
  }
})
