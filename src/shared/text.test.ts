import { expect, test } from 'claude-code/testing'

import { displayWidth, splitLines, stripAnsi, truncateToWidth } from './text'

test('splitLines は末尾の改行を数えない', async () => {
  expect(splitLines('')).toEqual([])
  expect(splitLines('\n\n')).toEqual([])
  expect(splitLines('a\nb\n')).toEqual(['a', 'b'])
  expect(splitLines('a\r\n\r\nb')).toEqual(['a', '', 'b'])
})

test('stripAnsi は色とリンクのエスケープを取り除く', async () => {
  expect(stripAnsi('\u001b[32mok\u001b[0m')).toBe('ok')
  expect(stripAnsi('\u001b]8;;https://x\u0007link\u001b]8;;\u0007')).toBe('link')
})

test('stripAnsi は残った制御文字も消し、タブは空白にする', async () => {
  expect(stripAnsi('a\u001bb\u0007c\u009bd')).toBe('abcd')
  expect(stripAnsi('a\tb')).toBe('a b')
})

test('splitLines は改行の多い入力でもすぐ終わる', async () => {
  const many = '\n'.repeat(200_000) + 'x'
  const started = Date.now()

  expect(splitLines(many).length).toBe(200_001)
  expect(Date.now() - started).toBeLessThan(1000)
})

test('displayWidth は全角を2マスと数える', async () => {
  expect(displayWidth('abc')).toBe(3)
  expect(displayWidth('テスト')).toBe(6)
})

test('truncateToWidth は幅に収まるように切る', async () => {
  expect(truncateToWidth('hello', 10)).toBe('hello')
  expect(truncateToWidth('hello world', 6)).toBe('hello…')
  expect(truncateToWidth('テストです', 5)).toBe('テス…')
  expect(truncateToWidth('abc', 0)).toBe('')
})
