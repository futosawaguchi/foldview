import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const group = (props: { isExpanded?: boolean; isCallsOnly?: boolean } = {}) =>
  ({
    plugin: 'foldview',
    component: 'ToolGroup',
    requestId: 'group_1',
    surface: 'terminal',
    viewport: { columns: 80, rows: 24 },
    props: {
      calls: [
        {
          tool_use_id: 'toolu_1',
          tool: 'Bash',
          input: { command: 'seq 1 10' },
          output: { stdout: '1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n', stderr: '', interrupted: false },
          isRunning: false,
          isErrored: false,
          isInterrupted: false,
        },
      ],
      isActive: false,
      isExpanded: props.isExpanded ?? false,
      isCallsOnly: props.isCallsOnly ?? true,
    },
  }) as const

// foldview の下にいるエンジンの代わり。標準のまとめ行を1行描く
const standInForEngine = (on: On) =>
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>Ran 1 shell command</Text>
  })

test('まとめ行を残し、その下に Bash の要約を足す', async ($, on) => {
  standInForEngine(on)
  const ui = await $.ui.mount(group())

  expect((await ui.find({ type: 'Text', text: /Ran 1 shell command/ }))?.text).toBe('Ran 1 shell command')
  expect((await ui.find({ type: 'Text', text: /seq 1 10/ }))?.text).toBe('seq 1 10 · 10 lines · 10')
  await ui.unmount()
})

test('開いているときと、ツール以外の行を含むときは標準のまま', async ($, on) => {
  standInForEngine(on)

  for (const input of [group({ isExpanded: true }), group({ isCallsOnly: false })]) {
    const ui = await $.ui.mount(input)

    expect(await ui.find({ type: 'Text', text: /seq 1 10/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('/foldview off のときは標準のまま', async ($, on) => {
  standInForEngine(on)
  on('state.get', { plugin: 'foldview', key: 'enabledOverride' }, () => ({
    value: { value: { shape: 'enabled-override-1', value: 'off' }, version: 1 },
  }))
  const ui = await $.ui.mount(group())

  expect(await ui.find({ type: 'Text', text: /seq 1 10/ })).toBeUndefined()
  await ui.unmount()
})
