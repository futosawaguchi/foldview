// Bash の結果から、折りたたんだ1行に出す内容を作る。描画とは切り離した純粋な関数。
import { lastLineOf, readBashFlags, readBashLines } from '../../shared/bash-output'

export { formatSummary } from '../../shared/bash-output'

export type BashSummary = {
  /** stdout と stderr を合わせた行数 */
  readonly lineCount: number
  /** 空行を除いた最後の行（stdout にあればそちら、なければ stderr） */
  readonly lastLine: string
}

/**
 * 折りたたむべき Bash の結果なら要約を返す。そのままにするものは undefined。
 *
 * そのままにするもの：画像、バックグラウンド実行、中断、出力が maxLines 行以下のもの。
 * エラーかどうかは呼び出し側（ToolResult の isErrored）で見る。
 */
export const summarizeBashOutput = (output: unknown, maxLines: number): BashSummary | undefined => {
  const lines = readBashLines(output)
  if (lines === undefined) return undefined

  const flags = readBashFlags(output)
  if (flags.isImage || flags.isInterrupted || flags.isBackground) return undefined

  const lineCount = lines.stdout.length + lines.stderr.length
  if (lineCount <= maxLines) return undefined

  return { lineCount, lastLine: lastLineOf(lines) }
}
