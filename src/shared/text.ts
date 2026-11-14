// 文字列の小さな道具。行への分割、ANSI エスケープの除去、表示幅での切り詰め。

const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g

export const stripAnsi = (text: string): string => text.replace(ANSI_ESCAPE, '')

/** 末尾の改行を落としてから行に分ける。空文字列は 0 行。 */
export const splitLines = (text: string): string[] => {
  const trimmed = text.replace(/(?:\r?\n)+$/, '')

  return trimmed === '' ? [] : trimmed.split(/\r?\n/)
}

/** 全角として2マス使う文字か。CJK・全角記号・絵文字のおおまかな範囲で判定する */
const isWide = (codePoint: number): boolean =>
  (codePoint >= 0x1100 && codePoint <= 0x115f) ||
  (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
  (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
  (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
  (codePoint >= 0xfe30 && codePoint <= 0xfe4f) ||
  (codePoint >= 0xff00 && codePoint <= 0xff60) ||
  (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
  (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
  (codePoint >= 0x20000 && codePoint <= 0x3fffd)

const charWidth = (char: string): number => (isWide(char.codePointAt(0) ?? 0) ? 2 : 1)

export const displayWidth = (text: string): number => {
  let width = 0
  for (const char of text) width += charWidth(char)

  return width
}

/** 表示幅が maxWidth を超えるときは末尾を切り、… を付ける */
export const truncateToWidth = (text: string, maxWidth: number): string => {
  if (displayWidth(text) <= maxWidth) return text
  if (maxWidth <= 0) return ''

  let width = 0
  let result = ''
  for (const char of text) {
    const next = width + charWidth(char)
    if (next > maxWidth - 1) break
    result += char
    width = next
  }

  return `${result}…`
}
