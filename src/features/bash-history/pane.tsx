// /foldview で開く Bash の一覧パネル。一覧で Enter を押すと全文に切り替わり、「← List」で一覧に戻る。
import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { BashRun, PaneView } from '../../../types'
import { EMPTY_HISTORY, HISTORY_SHAPE, LIST_VIEW, PANE_VIEW_SHAPE } from '../../state'
import { formatLineCount, formatSummary } from '../../shared/bash-output'
import { displayWidth, truncateToWidth } from '../../shared/text'
import { groupByPrompt } from './history'

const historyAtom = atom({ plugin: 'foldview', key: 'history' } as const, EMPTY_HISTORY, HISTORY_SHAPE)
const paneViewAtom = atom({ plugin: 'foldview', key: 'paneView' } as const, LIST_VIEW, PANE_VIEW_SHAPE)

export const PANE_ID = 'foldview-bash'
const PANE_TITLE = 'Bash history'
const BACK_KEY = 'back'

/** 一覧でコマンドに使う幅の上限。残りを「行数 · 最後の行」に使う */
const COMMAND_COLUMNS = 32

// 別ファイルから $ を受け取る関数は function 宣言で書く（エンジンの決まり）
export async function openBashPane($: EngineInterface): Promise<void> {
  await update($, paneViewAtom, () => LIST_VIEW)
  await $.ui.open({ id: PANE_ID, title: PANE_TITLE, focus: true, closeOnEscape: true })
}

const firstLine = (text: string): string => text.split(/\r?\n/, 1)[0] ?? ''

const padToWidth = (text: string, width: number): string => {
  const cut = truncateToWidth(text, width)

  return cut + ' '.repeat(Math.max(0, width - displayWidth(cut)))
}

const runSummary = (run: BashRun): string =>
  run.isBackground ? 'running in background' : formatSummary(run)

export const registerBashPane = (on: On): void => {
  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const history = await read($, historyAtom)
    const view = await read($, paneViewAtom)
    const width = Math.max(20, e.props.bodyColumns)

    const showList = async (focusKey?: string) => {
      await update($, paneViewAtom, () => LIST_VIEW)
      if (focusKey !== undefined) {
        await $.ui.scroll({ in: PANE_ID, to: { key: focusKey }, block: 'center' })
        await $.ui.focus({ requestId: PANE_ID, key: focusKey })
      }
    }
    const showDetail = async (runId: string) => {
      await update($, paneViewAtom, (): PaneView => ({ kind: 'detail', runId }))
      await $.ui.scroll({ in: PANE_ID, to: 'start' })
    }

    const detailRun = view.kind === 'detail' ? history.runs.find(run => run.id === view.runId) : undefined

    if (detailRun !== undefined) {
      const header = `$ ${firstLine(detailRun.command)}  (${formatLineCount(detailRun.lineCount)})`

      return (
        <Box flexDirection="column">
          <Box>
            <Button key={BACK_KEY} autoFocus onPress={() => void showList(detailRun.id)}>
              ← List
            </Button>
            <Text> </Text>
            <Text dimColor>{truncateToWidth(header, Math.max(10, width - 12))}</Text>
          </Box>
          <Text> </Text>
          {detailRun.lines.length === 0 ? (
            <Text dimColor>(no output)</Text>
          ) : (
            <Text color={detailRun.isErrored ? 'error' : undefined}>{detailRun.lines.join('\n')}</Text>
          )}
          {detailRun.droppedLines > 0 && (
            <Text dimColor>{`… ${detailRun.droppedLines} more lines were not kept (ctrl+o shows the transcript)`}</Text>
          )}
        </Box>
      )
    }

    const groups = groupByPrompt(history)
    if (groups.length === 0) {
      return <Text dimColor>No Bash runs in this session yet.</Text>
    }

    const commandColumns = Math.min(COMMAND_COLUMNS, Math.floor(width / 2))
    const summaryColumns = Math.max(0, width - commandColumns - 4)
    let isFirst = true

    return (
      <Box flexDirection="column">
        {groups.map((group, index) => {
          const title = group.prompt === undefined ? '(before the first prompt)' : `"${group.prompt}"`

          return (
            <Box key={`group-${group.runs[0]?.id ?? index}`} flexDirection="column">
              <Text dimColor>{truncateToWidth(`── ${title} `, width)}</Text>
              {group.runs.map(run => {
                const autoFocus = isFirst ? ({ autoFocus: true } as const) : {}
                isFirst = false

                return (
                  <Button key={run.id} plain {...autoFocus} onPress={() => void showDetail(run.id)}>
                    {run.isErrored ? <Text color="error">✗ </Text> : '  '}
                    {padToWidth(firstLine(run.command), commandColumns)}
                    {'  '}
                    <Text dimColor>{truncateToWidth(runSummary(run), summaryColumns)}</Text>
                  </Button>
                )
              })}
            </Box>
          )
        })}
      </Box>
    )
  })
}
