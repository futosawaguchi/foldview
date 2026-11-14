// Bash の結果（stdout / stderr などを持つ記録）を読む道具。折りたたみと一覧パネルで共有する。
import { splitLines, stripAnsi } from './text'

export type BashLines = {
  readonly stdout: readonly string[]
  readonly stderr: readonly string[]
}

export type BashFlags = {
  readonly isImage: boolean
  readonly isInterrupted: boolean
  readonly isBackground: boolean
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Bash の結果の記録か。形が違うものは undefined */
export const readBashLines = (output: unknown): BashLines | undefined => {
  const record = asRecord(output)
  if (record === undefined) return undefined

  return {
    stdout: splitLines(stripAnsi(asString(record['stdout']))),
    stderr: splitLines(stripAnsi(asString(record['stderr']))),
  }
}

export const readBashFlags = (output: unknown): BashFlags => {
  const record = asRecord(output) ?? {}

  return {
    isImage: record['isImage'] === true,
    isInterrupted: record['interrupted'] === true,
    isBackground: typeof record['backgroundTaskId'] === 'string',
  }
}

const lastNonBlank = (lines: readonly string[]): string | undefined =>
  [...lines].reverse().find(line => line.trim() !== '')

/** 空行を除いた最後の行。stdout にあればそちら、なければ stderr。どちらもなければ空文字列 */
export const lastLineOf = (lines: BashLines): string =>
  (lastNonBlank(lines.stdout) ?? lastNonBlank(lines.stderr) ?? '').trim()

/** 行数の文字。例：`1 line`、`42 lines` */
export const formatLineCount = (count: number): string => `${count} ${count === 1 ? 'line' : 'lines'}`

/** 「行数 · 最後の行」の文字。例：`42 lines · Tests: 12 passed` */
export const formatSummary = (summary: { lineCount: number; lastLine: string }): string => {
  const count = formatLineCount(summary.lineCount)

  return summary.lastLine === '' ? count : `${count} · ${summary.lastLine}`
}
