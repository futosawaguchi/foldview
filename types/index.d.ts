// foldview が $.state に持つ値の型。値はセッションの間だけ持ち、再起動すると消える。

/** 一覧パネルに出す Bash 1件の控え */
export type BashRun = {
  /** tool_use_id */
  id: string
  command: string
  /** どのプロンプトのあとに実行されたか（PromptMark の id） */
  promptId: number
  /** 控える前の行数（上限で切ったぶんも含む） */
  lineCount: number
  lastLine: string
  isErrored: boolean
  isBackground: boolean
  /** 控えた行。上限を超えたぶんは捨てる */
  lines: string[]
  /** 上限を超えて捨てた行数 */
  droppedLines: number
}

/** 一覧をプロンプトごとに区切るための、プロンプトの控え */
export type PromptMark = {
  id: number
  text: string
}

export type BashHistory = {
  prompts: PromptMark[]
  runs: BashRun[]
}

/** パネルに今出しているもの。一覧か、ある1件の全文か */
export type PaneView = { kind: 'list' } | { kind: 'detail'; runId: string }

/** /foldview on / off による、そのセッションだけの切り替え。default は設定ファイルの値に従う */
export type EnabledOverride = 'default' | 'on' | 'off'

declare module 'claude-code' {
  interface PluginState {
    foldview: {
      history: Shaped<BashHistory>
      paneView: Shaped<PaneView>
      enabledOverride: Shaped<EnabledOverride>
    }
  }
}
