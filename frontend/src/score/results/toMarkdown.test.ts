import { describe, expect, it } from 'vitest'
import { matchResult } from '../../test/fixtures'
import { resultToMarkdown } from './toMarkdown'

describe('resultToMarkdown', () => {
  it('includes the headline, criteria table, explanations and lists', () => {
    const md = resultToMarkdown(matchResult)
    expect(md).toContain('# Java Developer: 78/100 (Good match)')
    expect(md).toContain('| Core skills | 30% | 90 |')
    expect(md).toContain('### Soft skills (50/100)')
    expect(md).toContain('Missing:\n- Soft skills gap')
    expect(md).toContain('## Tailor the resume\n- Mention JPA work explicitly')
    expect(md).toContain('## Skills to build\n- Earn the Oracle Java certification')
    expect(md).toContain('_Scored by ollama / llama3.1:8b_')
  })

  it('writes "None" for empty lists', () => {
    expect(resultToMarkdown({ ...matchResult, gaps: [] })).toContain('## Gaps\n- None')
  })
})
