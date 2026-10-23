import type { MatchResult } from '../../api/types'

const bullets = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '- None')

/** Plain-text report for copying into notes, email or a tracker. */
export function resultToMarkdown(result: MatchResult): string {
  const lines = [
    `# ${result.requirements.title}: ${result.overall_score}/100 (${result.verdict})`,
    '',
    result.summary,
    '',
    '## Criteria',
    '',
    '| Criterion | Weight | Score |',
    '|---|---|---|',
    ...result.criteria.map((c) => `| ${c.label} | ${Math.round(c.weight * 100)}% | ${c.score} |`),
    '',
    ...result.criteria.flatMap((c) => [
      `### ${c.label} (${c.score}/100)`,
      '',
      c.rationale,
      '',
      ...(c.missing.length ? ['Missing:', bullets(c.missing), ''] : []),
    ]),
    '## Strengths',
    bullets(result.strengths),
    '',
    '## Gaps',
    bullets(result.gaps),
    '',
    '## Tailor the resume',
    bullets(result.resume_tips),
    '',
    '## Skills to build',
    bullets(result.skills_to_build),
    '',
    `_Scored by ${result.model_used.provider} / ${result.model_used.model}_`,
  ]
  return lines.join('\n')
}
