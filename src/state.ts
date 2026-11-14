// $.state に持つ値の初期値と shape のタグ。型は types/index.d.ts の PluginState に書く。
// エンジンの決まりで、atom(...) は値を読み書きするファイルの中で書く。ここには共有する部品だけを置く。
// shape のタグは、値の形を変えたら上げる（古い形の値を初期値として読み直すため）。
import type { BashHistory, EnabledOverride, PaneView } from '../types'

export const EMPTY_HISTORY: BashHistory = { prompts: [], runs: [] }
export const HISTORY_SHAPE = { shape: 'history-1' } as const

export const LIST_VIEW: PaneView = { kind: 'list' }
export const PANE_VIEW_SHAPE = { shape: 'pane-view-1' } as const

export const DEFAULT_OVERRIDE: EnabledOverride = 'default'
export const ENABLED_OVERRIDE_SHAPE = { shape: 'enabled-override-1' } as const

/** 設定ファイルの値と /foldview on / off から、今折りたたむかどうかを決める */
export const isFoldingEnabled = (configEnabled: boolean, override: EnabledOverride): boolean =>
  override === 'default' ? configEnabled : override === 'on'
