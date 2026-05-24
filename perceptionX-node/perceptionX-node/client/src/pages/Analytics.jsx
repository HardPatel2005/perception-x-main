import { useParams } from 'react-router-dom'
import AnalyticsDashboard from '../components/AnalyticsDashboard'
import AnalyticsDetail from '../components/AnalyticsDetail'

const Analytics = () => {
  const { fileId } = useParams()

  if (fileId) {
    return <AnalyticsDetail />
  }

  return <AnalyticsDashboard />
}

export default Analytics
