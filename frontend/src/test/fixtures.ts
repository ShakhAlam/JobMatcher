import type { MatchResult, ModelList, UserSettings } from '../api/types'

const criterion = (key: string, label: string, weight: number, score: number) => ({
  key,
  label,
  weight,
  score,
  rationale: `${label} rationale.`,
  evidence: [`${label} evidence`],
  missing: score < 90 ? [`${label} gap`] : [],
})

export const matchResult: MatchResult = {
  overall_score: 78,
  verdict: 'Good match',
  summary: 'Strong Java background with minor gaps in Java EE.',
  criteria: [
    criterion('skills', 'Core skills', 0.3, 90),
    criterion('experience', 'Experience & seniority', 0.2, 80),
    criterion('responsibilities', 'Responsibilities & domain', 0.2, 70),
    criterion('tools', 'Tools & keywords', 0.1, 60),
    criterion('education', 'Education & certifications', 0.1, 100),
    criterion('soft_skills', 'Soft skills', 0.1, 50),
  ],
  strengths: ['Deep Spring Boot experience'],
  gaps: ['No Java EE platform experience'],
  resume_tips: ['Mention JPA work explicitly'],
  skills_to_build: ['Earn the Oracle Java certification'],
  requirements: {
    title: 'Java Developer',
    seniority: 'senior',
    min_years_experience: 5,
    must_have_skills: ['Java'],
    nice_to_have_skills: [],
    tools_and_keywords: [],
    responsibilities: [],
    domain: null,
    education: [],
    certifications: [],
    soft_skills: [],
  },
  candidate: {
    name: 'Alex Rivera',
    current_title: 'Senior Software Engineer',
    total_years_experience: 8,
    skills: [],
    tools_and_technologies: [],
    roles: [],
    domains: [],
    education: [],
    certifications: [],
    soft_skills: [],
    achievements: [],
  },
  model_used: { provider: 'ollama', model: 'llama3.1:8b' },
  duration_ms: 63_000,
}

export const JD_TEXT = 'Senior Java Developer. Requires Java, Spring, SQL and 5+ years of experience.'
export const RESUME_TEXT = 'Alex Rivera. Senior engineer, 8 years of Java and Spring Boot at PayStream.'

export const userSettings: UserSettings = {
  provider: 'ollama',
  models: { ollama: 'qwen2.5-coder:14b', anthropic: 'claude-sonnet-5-5', openai: 'gpt-5-mini' },
  ollama_base_url: 'http://localhost:11434',
  temperature: 0,
  api_keys: { anthropic: { source: null, masked: null }, openai: { source: null, masked: null } },
}

export const ollamaModels: ModelList = {
  provider: 'ollama',
  models: [
    { id: 'llama3.1:8b', label: 'llama3.1:8b', detail: '8.0B · Q4_K_M · 4.9 GB', size_bytes: 4920753328 },
    { id: 'qwen2.5-coder:14b', label: 'qwen2.5-coder:14b', detail: '14.8B · Q4_K_M · 9.0 GB', size_bytes: 8988124298 },
  ],
  source: 'live',
  error: null,
}
