import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DisclaimerGate } from './components/DisclaimerGate'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Participants } from './pages/Participants'
import { ParticipantDetail } from './pages/ParticipantDetail'
import { BehaviourDetail } from './pages/BehaviourDetail'
import { Settings } from './pages/Settings'
import { InformantScreenerPage } from './pages/InformantScreenerPage'
import { FieldCapturePage } from './pages/FieldCapturePage'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { AboutPage } from './pages/AboutPage'
import { PricingPage } from './pages/PricingPage'
import { LoginPage } from './pages/LoginPage'
import { BillingPage } from './pages/BillingPage'
import { BillingSuccessPage } from './pages/BillingSuccessPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no practitioner gate, direct navigation. */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/success" element={<BillingSuccessPage />} />

        {/* Informant-facing route (brief §4, Phase 4): deliberately outside
            DisclaimerGate and Layout. It never touches IndexedDB or any
            practitioner/participant data, and shows no navigation chrome
            tying it to clinical records. */}
        <Route path="/screener" element={<InformantScreenerPage />} />
        <Route path="/field" element={<FieldCapturePage />} />

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
