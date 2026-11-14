// Bash の出力の折りたたみ。長い出力を「行数 · 最後の1行」の1行にする。
// 全文は ctrl+o（標準の全文表示）か、/foldview の一覧パネルで見る。
import type { On } from 'claude-code'

import type { Config } from '../../config'
import { truncateToWidth } from '../../shared/text'
import { formatSummary, summarizeBashOutput } from './summary'

/** 結果の行頭に標準の表示が付ける字下げと記号。描き替えると消えるので自分で付ける */
const GUTTER = '  ⎿  '
const GUTTER_WIDTH = 5

export const registerBashFold = (on: On, config: Config): void => {
  on('ui.render', { component: 'ToolResult', props: { tool: 'Bash' } }, async ($, e, next) => {
    if (e.surface !== 'terminal' || !config.enabled) return next(e)
    // ctrl+o や --verbose の全文表示、エラーは標準のまま
    if (e.props.isExpanded === true || e.props.isErrored) return next(e)

    const summary = summarizeBashOutput(e.props.output, config.bashMaxLines)
    if (summary === undefined) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const width = Math.max(10, (e.viewport?.columns ?? 80) - GUTTER_WIDTH)

    return (
      <Box>
        <Text dimColor>{GUTTER}</Text>
        <Text dimColor>{truncateToWidth(formatSummary(summary), width)}</Text>
      </Box>
    )
  })
}
