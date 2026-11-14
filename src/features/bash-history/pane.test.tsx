import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import type { BashHistory, PaneView } from '../../../types'
import { EMPTY_HISTORY } from '../../state'
import { addPrompt, addRun, captureRun } from './history'
import { PANE_ID } from './pane'

const PANE = {
  plugin: 'foldview',
  component: 'Pane',
  requestId: PANE_ID,
  surface: 'terminal',
  props: {
    title: 'Bash history',
    isFocused: true,
    bodyColumns: 80,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const sampleHistory = (): BashHistory => {
  let history = addPrompt(EMPTY_HISTORY, 'fix the tests')
  history = addRun(
    history,
    captureRun({ id: 't1', command: 'npm test', promptId: 1, output: { stdout: 'a\nb\nTests: 12 passed\n', stderr: '' } }),
  )
  history = addRun(history, captureRun({ id: 't2', command: 'false', promptId: 1, output: undefined, errorText: 'Exit code 1' }))

  return history
}

// $.state をテストの中で答える。shape のタグは src/state.ts と揃える
const seedState = (on: On, history: BashHistory, view: PaneView) => {
  on('state.get', { plugin: 'foldview', key: 'history' }, () => ({
    value: { value: { shape: 'history-1', value: history }, version: 1 },
  }))
  on('state.get', { plugin: 'foldview', key: 'paneView' }, () => ({
    value: { value: { shape: 'pane-view-1', value: view }, version: 1 },
  }))
}

test('まだ何もなければ、その旨を出す', async ($, on) => {
  seedState(on, EMPTY_HISTORY, { kind: 'list' })
  const ui = await $.ui.mount(PANE)

  expect((await ui.find({ type: 'Text', text: /No Bash runs/ }))?.text).toBe('No Bash runs in this session yet.')
  await ui.unmount()
})

test('一覧はプロンプトで区切り、新しい順に並べる', async ($, on) => {
  seedState(on, sampleHistory(), { kind: 'list' })
  const ui = await $.ui.mount(PANE)

  expect((await ui.find({ type: 'Text', text: /fix the tests/ }))?.text).toContain('"fix the tests"')
  expect(await ui.find({ type: 'Button', key: 't1' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 't2' })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /Tests: 12 passed/ }))?.text).toBe('3 lines · Tests: 12 passed')
  expect((await ui.find({ type: 'Text', text: /Esc: close/ }))?.text).toContain('Enter: open')
  await ui.unmount()
})

test('全文の画面では戻るボタンと全文を出す', async ($, on) => {
  seedState(on, sampleHistory(), { kind: 'detail', runId: 't1' })
  const ui = await $.ui.mount(PANE)

  expect(await ui.find({ type: 'Button', key: 'back' })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /^a\n/ }))?.text).toBe('a\nb\nTests: 12 passed')
  await ui.unmount()
})
