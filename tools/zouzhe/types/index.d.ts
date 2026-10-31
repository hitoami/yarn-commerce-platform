// drafted：大改已出原型，等第二次朱批。
export type Status = 'pending' | 'drafted' | 'doing' | 'done' | 'rejected'

// 刚点过准奏 / 驳回、GitHub 还没跟上时的本地暂记；at 为按下时刻（ISO）。
export type Pressed = { status: Status; at: string }

export type Memorial = {
  number: number
  title: string
  kind: string
  problem: string
  change: string
  prototype: string
  body: string
  url: string
  status: Status
  updatedAt: string
  // 每轮批阅 = 一条 Issue 评论（最近 5 条，纯文字），at 为月-日。
  rounds: { at: string; text: string }[]
}

declare module 'claude-code' {
  interface PluginState {
    zouzhe: {
      memorials: Shaped<Memorial[]>
      pressed: Shaped<Record<string, Pressed>>
      // 原型缩略图（JPEG base64），按奏折编号。
      thumbs: Record<string, string>
      rejecting: number | null
      revising: number | null
      loadedAt: string
      drafting: boolean
      opened: number | null
      // 底排「已颁行」「留中」是否展开，按状态名；默认折叠。
      unfolded: Record<string, boolean>
      // 卡片上刚发出的议事（等会话回复写进 Issue 评论前先显示），按奏折编号。
      asked: Record<string, string>
    }
  }
}
