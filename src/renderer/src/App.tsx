import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Sprint from './pages/Sprint'
import Browse from './pages/Browse'
import History from './pages/History'
import Agents from './pages/Agents'
import Settings from './pages/Settings'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sprint"    element={<Sprint />} />
          <Route path="browse"    element={<Browse />} />
          <Route path="history"   element={<History />} />
          <Route path="agents"    element={<Agents />} />
          <Route path="settings"  element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
