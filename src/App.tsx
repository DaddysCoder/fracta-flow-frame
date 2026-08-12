import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DisclaimerGate } from './components/DisclaimerGate'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Participants } from './pages/Participants'
import { ParticipantDetail } from './pages/ParticipantDetail'
import { BehaviourDetail } from './pages/BehaviourDetail'
import { Settings } from './pages/Settings'

function App() {
  return (
    <DisclaimerGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/participants" element={<Participants />} />
            <Route path="/participants/:participantId" element={<ParticipantDetail />} />
            <Route path="/behaviours/:behaviourId" element={<BehaviourDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DisclaimerGate>
  )
}

export default App
