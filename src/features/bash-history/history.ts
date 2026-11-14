// Bash の控えを作り、上限を守って足し、プロンプトごとにまとめる。描画やフックとは切り離した純粋な関数。
import type { BashHistory, BashRun, PromptMark } from '../../../types'
import { lastLineOf, readBashFlags, readBashLines } from '../../shared/bash-output'
import { splitLines, stripAnsi } from '../../shared/text'

/** 控える件数の上限。超えたら古いものから捨てる */
export const MAX_RUNS = 50
/** 1件あたりに控える行数の上限 */
export const MAX_LINES_PER_RUN = 2_000
/** 1件あたりに控える文字数の上限 */
export const MAX_CHARS_PER_RUN = 200_000
/** プロンプトの控えに残す文字数 */
const MAX_PROMPT_CHARS = 200

export type CaptureInput = {
  readonly id: string
  readonly command: string
  readonly promptId: number
  /** 成功したときの Bash の記録（stdout / stderr など） */
  readonly output: unknown
  /** エラーになったときに Claude が読んだ文字。成功なら undefined */
  readonly errorText?: string
}

/** 行の上限と文字数の上限の両方を守って、先頭から控える */
const capLines = (lines: readonly string[]): { kept: string[]; dropped: number } => {
  const kept: string[] = []
  let chars = 0

  for (const line of lines) {
    if (kept.length >= MAX_LINES_PER_RUN) break
    if (chars + line.length > MAX_CHARS_PER_RUN) break
    kept.push(line)
    chars += line.length + 1
  }

  return { kept, dropped: lines.length - kept.length }
}

/** 1回の Bash の結果から、一覧に出す控えを作る */
export const captureRun = (input: CaptureInput): BashRun => {
  const isErrored = input.errorText !== undefined
  const fromOutput = readBashLines(input.output) ?? { stdout: [], stderr: [] }
  const lines = isErrored
    ? { stdout: splitLines(stripAnsi(input.errorText ?? '')), stderr: [] }
    : fromOutput
  const all = [...lines.stdout, ...lines.stderr]
  const { kept, dropped } = capLines(all)

  return {
    id: input.id,
    // 画面に出す文字なので、出力と同じく制御文字を取り除く
    command: stripAnsi(input.command),
    promptId: input.promptId,
    lineCount: all.length,
    lastLine: lastLineOf(lines),
    isErrored,
    isBackground: !isErrored && readBashFlags(input.output).isBackground,
    lines: kept,
    droppedLines: dropped,
  }
}

/** 今のプロンプトの id。まだ何も送っていなければ 0 */
export const currentPromptId = (history: BashHistory): number => history.prompts.at(-1)?.id ?? 0

/** プロンプトを1つ足す。控えは最初の行だけを短くして持つ */
export const addPrompt = (history: BashHistory, text: string): BashHistory => {
  const firstLine = stripAnsi(text.trim().split(/\r?\n/, 1)[0] ?? '')
  const mark: PromptMark = { id: currentPromptId(history) + 1, text: firstLine.slice(0, MAX_PROMPT_CHARS) }

  return pruneUnusedPrompts({ ...history, prompts: [...history.prompts, mark] })
}

/** 控えを1件足す。上限を超えたら古いものから捨てる。同じ id は置き換える */
export const addRun = (history: BashHistory, run: BashRun): BashHistory => {
  const runs = [...history.runs.filter(one => one.id !== run.id), run].slice(-MAX_RUNS)

  return pruneUnusedPrompts({ ...history, runs })
}

/** どの控えからも指されなくなったプロンプトを捨てる。ただし最新のプロンプトは残す */
const pruneUnusedPrompts = (history: BashHistory): BashHistory => {
  const used = new Set(history.runs.map(run => run.promptId))
  const latest = currentPromptId(history)

  return { ...history, prompts: history.prompts.filter(mark => used.has(mark.id) || mark.id === latest) }
}

export type RunGroup = {
  /** プロンプトの文字。セッションの最初のプロンプトより前なら undefined */
  readonly prompt: string | undefined
  /** 新しい順 */
  readonly runs: readonly BashRun[]
}

/** 新しいプロンプトから順に、そのプロンプトのあとの Bash を新しい順にまとめる */
export const groupByPrompt = (history: BashHistory): RunGroup[] => {
  const groups: RunGroup[] = []
  const promptText = new Map(history.prompts.map(mark => [mark.id, mark.text]))

  for (const run of [...history.runs].reverse()) {
    const last = groups.at(-1)
    const text = promptText.get(run.promptId)
    if (last !== undefined && last.runs[0]?.promptId === run.promptId) {
      groups[groups.length - 1] = { ...last, runs: [...last.runs, run] }
    } else {
      groups.push({ prompt: text, runs: [run] })
    }
  }

  return groups
}
