import { expect, test } from 'claude-code/testing'

import { DEFAULT_CONFIG, parseConfig } from './config'

test('options が空なら既定値になる', async () => {
  expect(parseConfig({})).toEqual(DEFAULT_CONFIG)
})

test('enabled は真偽値だけを受け付ける', async () => {
  expect(parseConfig({ enabled: false }).enabled).toBe(false)
  expect(parseConfig({ enabled: 'false' }).enabled).toBe(DEFAULT_CONFIG.enabled)
})

test('bashMaxLines は 0 以上の整数を受け付ける', async () => {
  expect(parseConfig({ bashMaxLines: 0 }).bashMaxLines).toBe(0)
  expect(parseConfig({ bashMaxLines: 10 }).bashMaxLines).toBe(10)
  expect(parseConfig({ bashMaxLines: '5' }).bashMaxLines).toBe(5)
})

test('groupDetails は真偽値だけを受け付ける', async () => {
  expect(parseConfig({ groupDetails: false }).groupDetails).toBe(false)
  expect(parseConfig({ groupDetails: 'no' }).groupDetails).toBe(DEFAULT_CONFIG.groupDetails)
})

test('不正な bashMaxLines は既定値に戻る', async () => {
  for (const bashMaxLines of [-1, 2.5, 'many', '', 1_000_000]) {
    expect(parseConfig({ bashMaxLines }).bashMaxLines).toBe(DEFAULT_CONFIG.bashMaxLines)
  }
})
