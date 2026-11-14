import { expect, test } from 'claude-code/testing'

import { EMPTY_HISTORY } from '../../state'
import {
  addPrompt,
  addRun,
  captureRun,
  currentPromptId,
  groupByPrompt,
  MAX_LINES_PER_RUN,
  MAX_RUNS,
} from './history'

const run = (id: string, promptId: number, stdout = 'ok\n') =>
  captureRun({ id, command: `echo ${id}`, promptId, output: { stdout, stderr: '', interrupted: false } })

test('captureRun は行数と最後の行を控える', async () => {
  const captured = run('a', 1, 'one\ntwo\n\nthree\n')

  expect(captured.lineCount).toBe(4)
  expect(captured.lastLine).toBe('three')
  expect(captured.lines).toEqual(['one', 'two', '', 'three'])
  expect(captured.isErrored).toBe(false)
})

test('エラーのときは Claude が読んだ文字を控える', async () => {
  const captured = captureRun({ id: 'e', command: 'false', promptId: 1, output: undefined, errorText: 'Exit code 1\nboom' })

  expect(captured.isErrored).toBe(true)
  expect(captured.lines).toEqual(['Exit code 1', 'boom'])
  expect(captured.lastLine).toBe('boom')
})

test('行数の上限を超えたぶんは捨て、捨てた数を持つ', async () => {
  const many = Array.from({ length: MAX_LINES_PER_RUN + 5 }, (_, i) => `${i}`).join('\n')
  const captured = run('big', 1, many)

  expect(captured.lines.length).toBe(MAX_LINES_PER_RUN)
  expect(captured.droppedLines).toBe(5)
  expect(captured.lineCount).toBe(MAX_LINES_PER_RUN + 5)
})

test('件数の上限を超えたら古いものから捨てる', async () => {
  let history = addPrompt(EMPTY_HISTORY, 'first')
  for (let i = 0; i < MAX_RUNS + 3; i += 1) history = addRun(history, run(`r${i}`, 1))

  expect(history.runs.length).toBe(MAX_RUNS)
  expect(history.runs[0]?.id).toBe('r3')
})

test('プロンプトは最初の行だけを控え、使われなくなったら捨てる', async () => {
  let history = addPrompt(EMPTY_HISTORY, 'fix the tests\nplease')
  expect(history.prompts).toEqual([{ id: 1, text: 'fix the tests' }])

  // Bash のないプロンプトは、次のプロンプトが来たら捨てる
  history = addPrompt(history, 'second')
  expect(history.prompts.map(mark => mark.id)).toEqual([2])
  expect(currentPromptId(history)).toBe(2)
})

test('groupByPrompt は新しいプロンプトから、新しい順にまとめる', async () => {
  let history = addPrompt(EMPTY_HISTORY, 'first')
  history = addRun(history, run('a', currentPromptId(history)))
  history = addRun(history, run('b', currentPromptId(history)))
  history = addPrompt(history, 'second')
  history = addRun(history, run('c', currentPromptId(history)))

  const groups = groupByPrompt(history)

  expect(groups.map(group => group.prompt)).toEqual(['second', 'first'])
  expect(groups.map(group => group.runs.map(one => one.id))).toEqual([['c'], ['b', 'a']])
})
