// userConfig の読み取り・検証・既定値。設定値はすべてここを通して読む。
import type { PluginOptions } from 'claude-code'

export type Config = {
  /** 折りたたみ全体のオン・オフ（設定ファイルの値） */
  readonly enabled: boolean
  /** Bash の出力がこの行数を超えたら折りたたむ */
  readonly bashMaxLines: number
}

export const DEFAULT_CONFIG: Config = {
  enabled: true,
  bashMaxLines: 3,
}

/** bashMaxLines として受け付ける上限。大きすぎる値は折りたたみが効かないのと同じになる */
const MAX_BASH_MAX_LINES = 10_000

export const parseEnabled = (value: unknown): boolean =>
  typeof value === 'boolean' ? value : DEFAULT_CONFIG.enabled

export const parseBashMaxLines = (value: unknown): number => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value

  if (typeof number !== 'number' || !Number.isInteger(number)) return DEFAULT_CONFIG.bashMaxLines
  if (number < 0 || number > MAX_BASH_MAX_LINES) return DEFAULT_CONFIG.bashMaxLines

  return number
}

/** register に渡された options を検証し、不正な値は既定値に戻す。 */
export const parseConfig = (options: PluginOptions): Config => ({
  enabled: parseEnabled(options['enabled']),
  bashMaxLines: parseBashMaxLines(options['bashMaxLines']),
})
