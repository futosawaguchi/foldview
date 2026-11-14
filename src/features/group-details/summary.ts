// 標準のまとめ行（ToolGroup）の下に足す行を作る。描画とは切り離した純粋な関数。
import { formatSummary, lastLineOf, readBashLines } from '../../shared/bash-output'
import { stripAnsi } from '../../shared/text'

/** まとめ行の中の1件。ToolGroupCall から使うものだけを取り出した形 */
export type GroupCall = {
  readonly tool: string
  readonly input: unknown
  readonly output?: unknown
  readonly isRunning: boolean
}

/** 1つのまとめ行の下に出す Bash の件数の上限。超えたぶんは `+N more` にする */
export const MAX_BASH_LINES = 3
/** ファイル名やパターンを並べる数の上限。超えたぶんは `+N` にする */
const MAX_NAMES = 3

const field = (input: unknown, key: string): string | undefined => {
  if (typeof input !== 'object' || input === null) return undefined
  const value = (input as Record<string, unknown>)[key]

  return typeof value === 'string' ? value : undefined
}

const firstLine = (text: string): string => stripAnsi(text.split(/\r?\n/, 1)[0] ?? '').trim()

const baseName = (path: string): string => firstLine(path.split(/[\\/]/).filter(Boolean).at(-1) ?? path)

/** 名前を並べ、多いときは `+N` で省く。同じ名前は1回だけ出す */
const listNames = (names: readonly string[]): string => {
  const unique = [...new Set(names)]
  const shown = unique.slice(0, MAX_NAMES).join(', ')
  const rest = unique.length - MAX_NAMES

  return rest > 0 ? `${shown} +${rest}` : shown
}

/** Bash 1件の行。例：`npm test · 42 lines · Tests: 12 passed` */
export const describeBashCall = (call: GroupCall): string => {
  const command = firstLine(field(call.input, 'command') ?? '')
  if (call.isRunning) return `${command} · running…`

  const lines = readBashLines(call.output)
  if (lines === undefined) return command

  const lineCount = lines.stdout.length + lines.stderr.length
  const summary = lineCount === 0 ? 'no output' : formatSummary({ lineCount, lastLine: lastLineOf(lines) })

  return `${command} · ${summary}`
}

/** Read / Grep / Glob をまとめた1行。例：`app.ts, util.ts +1 · "login", "auth"`。なければ undefined */
export const describeLookups = (calls: readonly GroupCall[]): string | undefined => {
  const files = calls.flatMap(call => {
    const path = call.tool === 'Read' ? field(call.input, 'file_path') : undefined
    return path === undefined ? [] : [baseName(path)]
  })
  const patterns = calls.flatMap(call => {
    const pattern = call.tool === 'Grep' || call.tool === 'Glob' ? field(call.input, 'pattern') : undefined
    return pattern === undefined ? [] : [`"${firstLine(pattern)}"`]
  })
  const parts = [files, patterns].filter(names => names.length > 0).map(listNames)

  return parts.length === 0 ? undefined : parts.join(' · ')
}

/**
 * まとめ行の下に足す行を、上から順に返す。足すものがなければ空の配列。
 * 1行目に Read / Grep / Glob の名前。そのあとに Bash の最後の3件を実行順に出す。
 * それより前の Bash は、3件の前に `+N more` とだけ出す。
 */
export const buildGroupDetails = (calls: readonly GroupCall[]): string[] => {
  const details: string[] = []
  const lookups = describeLookups(calls)
  if (lookups !== undefined) details.push(lookups)

  const bash = calls.filter(call => call.tool === 'Bash')
  const shown = bash.slice(-MAX_BASH_LINES)
  if (bash.length > shown.length) details.push(`+${bash.length - shown.length} more`)
  details.push(...shown.map(describeBashCall))

  return details
}
