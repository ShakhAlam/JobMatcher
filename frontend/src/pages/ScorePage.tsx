import InsightsOutlined from '@mui/icons-material/InsightsOutlined'
import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'

export default function ScorePage() {
  return (
    <>
      <PageHeader
        title="Score a resume"
        subtitle="Paste or upload a job description and a resume to see how well they match."
      />
      <Placeholder
        icon={<InsightsOutlined sx={{ fontSize: 48 }} />}
        title="Scoring workspace coming next"
        description="Job description and resume inputs with PDF/DOCX upload, the Score Resume button, and the results view with a criteria bar chart arrive in Phase 4."
      />
    </>
  )
}
