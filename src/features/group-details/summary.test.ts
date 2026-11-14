import { expect, test } from 'claude-code/testing'

import { buildGroupDetails, describeBashCall, describeLookups, formatDetailLine } from './summary'
import type { GroupCall } from './summary'

// 幅を気にしないときの1行の文字
const plain = (calls: readonly GroupCall[]) => buildGroupDetails(calls).map(line => formatDetailLine(line, 200))

const bash = (command: string, stdout: string, isRunning = false): GroupCall => ({
  tool: 'Bash',
  input: { command },
  output: isRunning ? undefined : { stdout, stderr: '', interrupted: false },
  isRunning,
})

test('Bash は「コマンド · 行数 · 最後の行」になる', async () => {
  expect(plain([bash('npm test', 'a\nb\nTests: 12 passed\n')])).toEqual(['npm test · 3 lines · Tests: 12 passed'])
  expect(plain([bash('true', '')])).toEqual(['true · no output'])
  expect(plain([bash('sleep 5', '', true)])).toEqual(['sleep 5 · running…'])
})

test('複数行のコマンドは最初の行だけを出す', async () => {
  expect(describeBashCall(bash("python3 - <<'EOF'\nprint(1)\nEOF", '1\n'))).toEqual({ text: "python3 - <<'EOF'", summary: '1 line · 1' })
})

test('Read はファイル名、Grep と Glob はパターンを並べる', async () => {
  const calls: GroupCall[] = [
    { tool: 'Read', input: { file_path: '/a/b/app.ts' }, isRunning: false },
    { tool: 'Read', input: { file_path: '/a/util.ts' }, isRunning: false },
    { tool: 'Grep', input: { pattern: 'login' }, isRunning: false },
    { tool: 'Glob', input: { pattern: '**/*.test.ts' }, isRunning: false },
  ]

  expect(describeLookups(calls)).toBe('app.ts, util.ts · "login", "**/*.test.ts"')
})

test('名前が多いときは +N で省き、同じ名前は1回だけ出す', async () => {
  const reads = ['a.ts', 'b.ts', 'a.ts', 'c.ts', 'd.ts', 'e.ts'].map(
    (name): GroupCall => ({ tool: 'Read', input: { file_path: `/x/${name}` }, isRunning: false }),
  )

  expect(describeLookups(reads)).toBe('a.ts, b.ts, c.ts +2')
})

test('Bash は最後の3件を実行順に出し、それより前は +N more にする', async () => {
  const calls = ['one', 'two', 'three', 'four', 'five'].map(name => bash(name, `${name}\n`))

  expect(plain(calls)).toEqual([
    '+2 more',
    'three · 1 line · three',
    'four · 1 line · four',
    'five · 1 line · five',
  ])
})

test('名前の行が先、Bash の行があと', async () => {
  const calls: GroupCall[] = [bash('ls', 'x\n'), { tool: 'Read', input: { file_path: '/r/README.md' }, isRunning: false }]

  expect(plain(calls)).toEqual(['README.md', 'ls · 1 line · x'])
})

test('長いコマンドは幅の半分（最大40）で切り、結果を見せる', async () => {
  const long = bash('claude plugin test . 2>&1 | grep -E "^\\(fail\\)|Error|Received|Expected" | head -20', 'x\nRan 44 tests\n')

  expect(formatDetailLine(describeBashCall(long), 100)).toBe(
    'claude plugin test . 2>&1 | grep -E "^\\… · 2 lines · Ran 44 tests',
  )
  // 狭いときは幅の半分まで
  expect(formatDetailLine(describeBashCall(long), 40)).toBe('claude plugin test … · 2 lines · Ran 44…')
})

test('ファイル名の制御文字は取り除く', async () => {
  const calls: GroupCall[] = [{ tool: 'Read', input: { file_path: '/x/\u001b[31mevil\u0007.ts' }, isRunning: false }]

  expect(describeLookups(calls)).toBe('evil.ts')
})

test('足すものがなければ空', async () => {
  expect(buildGroupDetails([{ tool: 'WebFetch', input: { url: 'https://example.com' }, isRunning: false }])).toEqual([])
})
