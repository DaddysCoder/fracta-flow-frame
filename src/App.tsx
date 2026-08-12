import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DisclaimerGate } from './components/DisclaimerGate'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Participants } from './pages/Participants'
import { ParticipantDetail } from './pages/ParticipantDetail'
import { BehaviourDetail } from './pages/BehaviourDetail'
import { Settings } from './pages/Settings'
import { InformantScreenerPage } from './pages/InformantScreenerPage'
import { InformantReportPage } from './pages/InformantReportPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Informant-facing routes (brief §4, Phase 4 + Phase 1.2): deliberately
            outside DisclaimerGate and Layout. Neither touches IndexedDB or any
            practitioner/participant data, and both show no navigation chrome
            tying them to clinical records. */}
        <Route path="/screener" element={<InformantScreenerPage />} />
        <Route path="/report" element={<InformantReportPage />} />

        <Route
          element={
            <DisclaimerGate>
              <Layout />
            </DisclaimerGate>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/participants" element={<Participants />} />
          <Route path="/participants/:participantId" element={<ParticipantDetail />} />
          <Route path="/behaviours/:behaviourId" element={<BehaviourDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
