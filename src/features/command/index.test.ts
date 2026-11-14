import { expect, test } from 'claude-code/testing'

import { parseCommandArgs } from './index'

test('引数なしはパネルを開く', async () => {
  expect(parseCommandArgs('')).toEqual({ kind: 'open' })
  expect(parseCommandArgs('  ')).toEqual({ kind: 'open' })
})

test('on / off は大文字小文字を区別しない', async () => {
  expect(parseCommandArgs('on')).toEqual({ kind: 'set', override: 'on' })
  expect(parseCommandArgs(' OFF ')).toEqual({ kind: 'set', override: 'off' })
})

test('分からない引数は使い方を出す', async () => {
  expect(parseCommandArgs('toggle')).toEqual({ kind: 'usage' })
})
