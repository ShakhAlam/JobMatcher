import PersonOutlined from '@mui/icons-material/PersonOutlined'
import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" subtitle="Your details and the default resume used for scoring." />
      <Placeholder
        icon={<PersonOutlined sx={{ fontSize: 48 }} />}
        title="Profile coming soon"
        description="Save your name, headline and a default resume so you only need to paste a job description each time."
      />
    </>
  )
}
