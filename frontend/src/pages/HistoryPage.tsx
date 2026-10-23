import HistoryOutlined from '@mui/icons-material/HistoryOutlined'
import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="History" subtitle="Past scoring runs and their results." />
      <Placeholder
        icon={<HistoryOutlined sx={{ fontSize: 48 }} />}
        title="No history yet"
        description="Every scoring run will be saved here so you can reopen its full breakdown."
      />
    </>
  )
}
