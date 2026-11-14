// 標準のまとめ行（「Ran 3 shell commands」など）の下に、Bash ごとの要約と、読んだファイル名・検索パターンを足す。
// まとめ行そのものは標準のまま残し、クリックして開いたときは標準の全文を出す。
import { atom, read } from 'claude-code'
import type { On } from 'claude-code'

import type { Config } from '../../config'
import { stripAnsi } from '../../shared/text'
import { DEFAULT_OVERRIDE, ENABLED_OVERRIDE_SHAPE, isFoldingEnabled } from '../../state'
import { buildGroupDetails, formatDetailLine } from './summary'

const enabledOverrideAtom = atom(
  { plugin: 'foldview', key: 'enabledOverride' } as const,
  DEFAULT_OVERRIDE,
  ENABLED_OVERRIDE_SHAPE,
)

/** 標準の結果の行と同じ字下げと記号 */
const GUTTER = '  ⎿  '
const GUTTER_WIDTH = 5

export const registerGroupDetails = (on: On, config: Config): void => {
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || !config.groupDetails) return next(e)
    if (!isFoldingEnabled(config.enabled, await read($, enabledOverrideAtom))) return next(e)
    // 開いているときは標準の全文。エラーや中断、ツール以外の行を含むまとめ行も標準のまま
    if (e.props.isExpanded || e.props.isCallsOnly !== true) return next(e)

    const details = buildGroupDetails(e.props.calls)
    if (details.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const width = Math.max(10, (e.viewport?.columns ?? 80) - GUTTER_WIDTH)
    const row = await next(e)

    return (
      <Box flexDirection="column">
        {row}
        {details.map((line, index) => (
          <Box key={`detail-${index}`}>
            <Text dimColor>{GUTTER}</Text>
            {/* 部品ごとにも掃除しているが、画面に出す直前にもう一度制御文字を取り除く */}
            <Text dimColor>{stripAnsi(formatDetailLine(line, width))}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
