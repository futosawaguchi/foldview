// /foldview コマンド。引数なしで Bash の一覧パネルを開き、on / off で折りたたみを切り替える。
// 結果は文字で返さずトーストで知らせる（返した文字は Claude にも渡ってしまうため）。
import { atom, update } from 'claude-code'
import type { On } from 'claude-code'

import type { EnabledOverride } from '../../../types'
import { DEFAULT_OVERRIDE, ENABLED_OVERRIDE_SHAPE } from '../../state'
import { openBashPane } from '../bash-history/pane'

const enabledOverrideAtom = atom(
  { plugin: 'foldview', key: 'enabledOverride' } as const,
  DEFAULT_OVERRIDE,
  ENABLED_OVERRIDE_SHAPE,
)

export const COMMAND_NAME = 'foldview'

export type CommandAction = { kind: 'open' } | { kind: 'set'; override: EnabledOverride } | { kind: 'usage' }

/** コマンドの引数を読む。分からない引数は使い方を出す */
export const parseCommandArgs = (args: string): CommandAction => {
  const word = args.trim().toLowerCase()

  if (word === '') return { kind: 'open' }
  if (word === 'on') return { kind: 'set', override: 'on' }
  if (word === 'off') return { kind: 'set', override: 'off' }

  return { kind: 'usage' }
}

const USAGE = '/foldview opens the Bash history · /foldview on | off folds output for this session'

export const registerCommand = (on: On): void => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND_NAME,
      description: 'Open the Bash history, or turn folding on/off for this session',
      argumentHint: '[on|off]',
      // Claude の作業中でもパネルを開けるようにする
      immediate: true,
    })

    return next(e)
  })

  on('command.run', { command: COMMAND_NAME }, async ($, e) => {
    const action = parseCommandArgs(e.args)

    if (action.kind === 'open') {
      await openBashPane($)
    } else if (action.kind === 'set') {
      await update($, enabledOverrideAtom, () => action.override)
      $.ui.toast(`foldview: ${action.override} (this session)`)
    } else {
      $.ui.toast(USAGE)
    }

    return {}
  }).catch(($, e) => {
    $.ui.toast(`foldview: /${COMMAND_NAME} failed`)

    return {}
  })
}
