// Mirrors backend/app/scoring/schemas.py and backend/app/extract/documents.py.

export type LLMProvider = 'ollama' | 'anthropic' | 'openai'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  api_key?: string
  base_url?: string
  temperature?: number
}

export interface ScoreRequest {
  job_description: string
  resume: string
  llm?: LLMConfig
  weights?: Record<string, number>
}

export interface CriterionScore {
  key: string
  label: string
  weight: number
  score: number
  rationale: string
  evidence: string[]
  missing: string[]
}

export interface JobRequirements {
  title: string
  seniority: string | null
  min_years_experience: number | null
  must_have_skills: string[]
  nice_to_have_skills: string[]
  tools_and_keywords: string[]
  responsibilities: string[]
  domain: string | null
  education: string[]
  certifications: string[]
  soft_skills: string[]
}

export interface CandidateProfile {
  name: string | null
  current_title: string | null
  total_years_experience: number | null
  skills: string[]
  tools_and_technologies: string[]
  roles: string[]
  domains: string[]
  education: string[]
  certifications: string[]
  soft_skills: string[]
  achievements: string[]
}

export interface MatchResult {
  overall_score: number
  verdict: string
  summary: string
  criteria: CriterionScore[]
  strengths: string[]
  gaps: string[]
  /** Rewording or surfacing of experience the resume already shows. */
  resume_tips: string[]
  /** Missing skills or certifications to gain (never things to add to the resume). */
  skills_to_build: string[]
  requirements: JobRequirements
  candidate: CandidateProfile
  model_used: { provider: LLMProvider; model: string }
  duration_ms: number
}

export interface ExtractResult {
  filename: string
  file_type: 'pdf' | 'docx' | 'txt'
  text: string
  char_count: number
  pages: number | null
  warnings: string[]
}

/** Backend input limits (ScoreRequest field constraints). */
export const MIN_INPUT_CHARS = 20
export const MAX_INPUT_CHARS = 50_000
export const ACCEPTED_UPLOAD_TYPES = '.pdf,.docx,.txt,.md'
export const MAX_UPLOAD_MB = 5
