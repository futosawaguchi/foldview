// エントリポイント。設定を読み、各機能の登録関数を呼ぶだけにする。
import type { Register } from 'claude-code'

import { parseConfig } from '../src/config'
import { registerBashFold } from '../src/features/bash-fold'
import { registerBashPane } from '../src/features/bash-history/pane'
import { registerHistoryRecording } from '../src/features/bash-history/record'
import { registerCommand } from '../src/features/command'

export const register: Register = (on, options) => {
  const config = parseConfig(options)

  registerBashFold(on, config)
  registerHistoryRecording(on)
  registerBashPane(on)
  registerCommand(on)
}
