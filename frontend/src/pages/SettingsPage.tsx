import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Choose the model that scores resumes." />
      <Placeholder
        icon={<SettingsOutlined sx={{ fontSize: 48 }} />}
        title="Model settings coming soon"
        description="Pick Ollama, Claude or OpenAI, choose a model from the available list, and manage API keys."
      />
    </>
  )
}
