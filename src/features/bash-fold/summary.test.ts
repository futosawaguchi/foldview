import { expect, test } from 'claude-code/testing'

import { formatSummary, summarizeBashOutput } from './summary'

const output = (stdout: string, stderr = '', extra: Record<string, unknown> = {}) => ({
  stdout,
  stderr,
  interrupted: false,
  ...extra,
})

test('しきい値以下の出力は折りたたまない', async () => {
  expect(summarizeBashOutput(output('a\nb\nc\n'), 3)).toBeUndefined()
  expect(summarizeBashOutput(output(''), 0)).toBeUndefined()
})

test('しきい値を超えたら行数と最後の行を返す', async () => {
  const summary = summarizeBashOutput(output('build\n\nTests: 12 passed\n\n', 'warn: x\n'), 3)

  expect(summary?.lineCount).toBe(4)
  expect(summary?.lastLine).toBe('Tests: 12 passed')
})

test('stdout が空なら stderr の最後の行を使う', async () => {
  const summary = summarizeBashOutput(output('', 'one\ntwo\nthree\nfour'), 3)

  expect(summary?.lastLine).toBe('four')
})

test('色のエスケープは取り除く', async () => {
  const summary = summarizeBashOutput(output('1\n2\n3\n\u001b[32mdone\u001b[0m'), 3)

  expect(summary?.lastLine).toBe('done')
})

test('画像・中断・バックグラウンド実行は折りたたまない', async () => {
  const long = '1\n2\n3\n4\n5'

  expect(summarizeBashOutput(output(long, '', { isImage: true }), 3)).toBeUndefined()
  expect(summarizeBashOutput(output(long, '', { interrupted: true }), 3)).toBeUndefined()
  expect(summarizeBashOutput(output(long, '', { backgroundTaskId: 'b1' }), 3)).toBeUndefined()
})

test('形の違う出力は折りたたまない', async () => {
  expect(summarizeBashOutput(undefined, 3)).toBeUndefined()
  expect(summarizeBashOutput('text', 3)).toBeUndefined()
})

test('formatSummary は単数形と空の最後の行を扱う', async () => {
  expect(formatSummary({ lineCount: 42, lastLine: 'ok' })).toBe('42 lines · ok')
  expect(formatSummary({ lineCount: 1, lastLine: '' })).toBe('1 line')
})
