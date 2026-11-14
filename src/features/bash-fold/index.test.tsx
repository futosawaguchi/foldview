import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const bashResult = (stdout: string, isErrored = false) =>
  ({
    plugin: 'foldview',
    component: 'ToolResult',
    viewport: { columns: 80, rows: 24 },
    requestId: 'toolu_1',
    surface: 'terminal',
    props: {
      tool_use_id: 'toolu_1',
      tool: 'Bash',
      output: { stdout, stderr: '', interrupted: false },
      isErrored,
    },
  }) as const

// foldview が描かなかったときに出る、エンジンの代わりの行
const standInForEngine = (on: On) =>
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

test('長い出力は「行数 · 最後の行」の1行になる', async ($, on) => {
  standInForEngine(on)
  const ui = await $.ui.mount(bashResult('1\n2\n3\n4\nTests: 12 passed\n'))

  expect((await ui.find({ type: 'Text', text: /lines/ }))?.text).toBe('5 lines · Tests: 12 passed')
  expect(await ui.find({ type: 'Text', text: /engine/ })).toBeUndefined()
  await ui.unmount()
})

test('短い出力とエラーは標準のまま', async ($, on) => {
  standInForEngine(on)

  for (const input of [bashResult('one\ntwo\n'), bashResult('1\n2\n3\n4\n5\n', true)]) {
    const ui = await $.ui.mount(input)

    expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
    await ui.unmount()
  }
})
