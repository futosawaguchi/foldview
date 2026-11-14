// 一覧パネルのために、プロンプトと Bash の結果を控えるフック。
// 結果は見るだけで、Claude に渡るものは変えない（next の結果をそのまま返す）。
import { atom, update } from 'claude-code'
import type { On } from 'claude-code'

import { EMPTY_HISTORY, HISTORY_SHAPE } from '../../state'
import { addPrompt, addRun, captureRun, currentPromptId } from './history'

const historyAtom = atom({ plugin: 'foldview', key: 'history' } as const, EMPTY_HISTORY, HISTORY_SHAPE)

// 万一フックが失敗しても、プロンプトやツールはそのまま進める（next を呼んだあとなら、その結果を返す）
const passThrough = <E, R>(_: unknown, e: E, next: (e: E) => Promise<R>): Promise<R> => next(e)

export const registerHistoryRecording = (on: On): void => {
  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)
    // 自分で打ったプロンプトだけを区切りにする（スラッシュコマンドや自動の通知は除く）
    if (e.command === undefined && e.isMeta !== true && e.text.trim() !== '') {
      try {
        await update($, historyAtom, history => addPrompt(history, e.text))
      } catch {
        // 控えに失敗しても、プロンプトの送信には影響させない
      }
    }

    return result
  }).catch(passThrough)

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    // サブエージェントの Bash は会話欄に行として出ないので控えない。拒否されたものは実行されていない
    if (e.agentId !== undefined || ran.deny !== undefined) return ran

    try {
      await update($, historyAtom, history =>
        addRun(
          history,
          captureRun({
            id: e.tool_use_id ?? `run-${history.runs.length}`,
            command: e.command,
            promptId: currentPromptId(history),
            output: ran.result,
            ...(ran.isError === true ? { errorText: ran.text ?? '' } : {}),
          }),
        ),
      )
    } catch {
      // 控えに失敗しても、ツールの結果には影響させない
    }

    return ran
  }).catch(passThrough)
}
