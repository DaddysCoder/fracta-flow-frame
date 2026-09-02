import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DisclaimerGate } from './components/DisclaimerGate'
import { Layout } from './components/Layout'

function RouteLoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8542E]/20 border-t-[#E8542E]"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Participants = lazy(() => import('./pages/Participants').then((m) => ({ default: m.Participants })))
const ParticipantDetail = lazy(() =>
  import('./pages/ParticipantDetail').then((m) => ({ default: m.ParticipantDetail })),
)
const BehaviourDetail = lazy(() =>
  import('./pages/BehaviourDetail').then((m) => ({ default: m.BehaviourDetail })),
)
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const InformantScreenerPage = lazy(() =>
  import('./pages/InformantScreenerPage').then((m) => ({ default: m.InformantScreenerPage })),
)
const FieldCapturePage = lazy(() =>
  import('./pages/FieldCapturePage').then((m) => ({ default: m.FieldCapturePage })),
)
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const PricingPage = lazy(() => import('./pages/PricingPage').then((m) => ({ default: m.PricingPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const BillingPage = lazy(() => import('./pages/BillingPage').then((m) => ({ default: m.BillingPage })))
const BillingSuccessPage = lazy(() =>
  import('./pages/BillingSuccessPage').then((m) => ({ default: m.BillingSuccessPage })),
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
