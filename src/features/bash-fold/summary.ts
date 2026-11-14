// Bash の結果から、折りたたんだ1行に出す内容を作る。描画とは切り離した純粋な関数。
import { splitLines, stripAnsi } from '../../shared/text'

export type BashSummary = {
  /** stdout と stderr を合わせた行数 */
  readonly lineCount: number
  /** 空行を除いた最後の行（stdout にあればそちら、なければ stderr） */
  readonly lastLine: string
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

const lastNonBlank = (lines: readonly string[]): string | undefined =>
  [...lines].reverse().find(line => line.trim() !== '')

/**
 * 折りたたむべき Bash の結果なら要約を返す。そのままにするものは undefined。
 *
 * そのままにするもの：画像、バックグラウンド実行、中断、出力が maxLines 行以下のもの。
 * エラーかどうかは呼び出し側（ToolResult の isErrored）で見る。
 */
export const summarizeBashOutput = (output: unknown, maxLines: number): BashSummary | undefined => {
  if (typeof output !== 'object' || output === null) return undefined

  const record = output as Record<string, unknown>
  if (record['isImage'] === true) return undefined
  if (record['interrupted'] === true) return undefined
  if (typeof record['backgroundTaskId'] === 'string') return undefined

  const stdout = splitLines(stripAnsi(asString(record['stdout'])))
  const stderr = splitLines(stripAnsi(asString(record['stderr'])))
  const lines = [...stdout, ...stderr]

  if (lines.length <= maxLines) return undefined

  const lastLine = (lastNonBlank(stdout) ?? lastNonBlank(stderr) ?? '').trim()

  return { lineCount: lines.length, lastLine }
}

/** 折りたたんだ行の文字。例：`42 lines · Tests: 12 passed` */
export const formatSummary = (summary: BashSummary): string => {
  const count = `${summary.lineCount} ${summary.lineCount === 1 ? 'line' : 'lines'}`

  return summary.lastLine === '' ? count : `${count} · ${summary.lastLine}`
}
