import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { ANTECEDENT_CONTEXT_OPTIONS, CONSEQUENCE_OPTIONS, SETTING_EVENT_OPTIONS } from '../lib/fbaContent'
import { SEVERITY_SCALE, RISK_FLAG_OPTIONS } from '../lib/scales'
import { encodeIncidentReportPayload } from '../lib/incidentReportPayload'
import type { RiskFlagItem } from '../lib/types'

// Informant-facing standalone page for incident/ABC reporting (brief Part
// B, step 11) — same no-IndexedDB, no-nav-chrome shape as
// InformantScreenerPage. Offers the generic option pools (fbaContent.ts)
// plus free text rather than a behaviour-specific checklist: the invite QR
// never carries that behaviour's option pool (see incidentReportPayload.ts
// for the measured payload-size reasoning), so this page has no way to
// know it. The practitioner reconciles/re-tags on import.
export function IncidentReportPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const role = searchParams.get('role') || 'informant'

  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16))
  const [durationMinutes, setDurationMinutes] = useState('')
  const [severityRating, setSeverityRating] = useState<0 | 1 | 2 | 3>(0)
  const [settingEvent, setSettingEvent] = useState('')
  const [antecedentText, setAntecedentText] = useState('')
  const [consequenceText, setConsequenceText] = useState('')
  const [riskFlags, setRiskFlags] = useState<RiskFlagItem[]>([])
  const [payloadText, setPayloadText] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function toggleRiskFlag(flag: RiskFlagItem) {
    setRiskFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]))
  }

  function appendText(existing: string, addition: string): string {
    const trimmed = existing.trim()
    return trimmed ? `${trimmed}; ${addition}` : addition
  }

  useEffect(() => {
    if (!payloadText) return
    let cancelled = false
    QRCode.toDataURL(payloadText, { errorCorrectionLevel: 'M', margin: 2, width: 480 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [payloadText])

  if (!token || !token.trim()) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#F5F5F5] p-6">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-lg font-display font-bold text-[#111111]">This link isn't ready to use</h1>
          <p className="text-sm text-slate-600">
            It's missing the information it needs to work. Ask the practitioner for a fresh QR
            code or link — this one may be incomplete, mistyped, or already used.
          </p>
        </div>
      </div>
    )
  }

  function handleSubmit() {
    if (!token || !antecedentText.trim() || !consequenceText.trim()) return
    setPayloadText(
      encodeIncidentReportPayload({
        t: token,
        dt: new Date(dateTime).toISOString(),
        dur: durationMinutes ? Number(durationMinutes) : null,
        sev: severityRating,
        se: settingEvent,
        at: antecedentText,
        ct: consequenceText,
        rf: riskFlags,
      }),
    )
  }

  async function handleCopy() {
    if (!payloadText) return
    await navigator.clipboard.writeText(payloadText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (payloadText) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#F5F5F5] p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-lg font-display font-bold text-[#111111]">Thanks — you're done</h1>
          <p className="text-sm text-slate-600">
            Show this code to the practitioner, or send them the text below — whichever's
            easier. No camera required for the second option.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Completed incident report code" className="mx-auto rounded-lg border border-slate-200" />
            ) : (
              <p className="text-sm text-slate-500">Generating code…</p>
            )}
            <div className="text-left">
              <p className="text-xs font-medium text-slate-500 mb-1">Or copy this code</p>
              <textarea readOnly value={payloadText} className="w-full rounded border border-slate-300 p-2 font-mono text-[10px]" rows={3} />
              <button onClick={handleCopy} className="mt-1 w-full rounded bg-[#111111] text-white px-3 py-2 text-sm font-semibold">
                {copied ? 'Copied' : 'Copy code'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#F5F5F5] p-4">
      <div className="max-w-lg mx-auto space-y-4 py-4">
        <div>
          <h1 className="text-lg font-display font-bold text-[#111111]">Report an incident</h1>
          <p className="text-sm text-slate-600 mt-1">
            You've been asked (as a {role}) to describe something you witnessed. Nothing you
            enter is sent anywhere — when you're done you'll get a code to show back to the
            practitioner.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
          <label className="block text-sm text-slate-700">
            When did this happen?
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm text-slate-700">
            How long did it last (minutes, optional)
            <input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-medium text-slate-800">What happened right before?</p>
          <div className="flex flex-wrap gap-1.5">
            {ANTECEDENT_CONTEXT_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setAntecedentText((prev) => appendText(prev, o.label))}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
              >
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={antecedentText}
            onChange={(e) => setAntecedentText(e.target.value)}
            rows={2}
            placeholder="Describe in your own words, or tap the options above"
            className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-medium text-slate-800">What happened right after?</p>
          <div className="flex flex-wrap gap-1.5">
            {CONSEQUENCE_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setConsequenceText((prev) => appendText(prev, o.label))}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
              >
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={consequenceText}
            onChange={(e) => setConsequenceText(e.target.value)}
            rows={2}
            placeholder="Describe in your own words, or tap the options above"
            className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-medium text-slate-800">Anything unusual going on beforehand?</p>
          <div className="flex flex-wrap gap-1.5">
            {SETTING_EVENT_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSettingEvent((prev) => appendText(prev, o.label))}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
              >
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={settingEvent}
            onChange={(e) => setSettingEvent(e.target.value)}
            rows={2}
            placeholder="Optional — e.g. poor sleep, missed medication"
            className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-medium text-slate-800">How severe was it?</p>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_SCALE.map((s) => (
              <label
                key={s.value}
                className={`cursor-pointer rounded-md border px-2 py-1.5 text-xs ${
                  severityRating === s.value ? 'border-[#111111] bg-[#111111] text-white' : 'border-slate-300 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  className="sr-only"
                  checked={severityRating === s.value}
                  onChange={() => setSeverityRating(s.value as 0 | 1 | 2 | 3)}
                />
                {s.value} — {s.label}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-medium text-slate-800">Did any of these happen?</p>
          <div className="flex flex-wrap gap-3">
            {RISK_FLAG_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={riskFlags.includes(r.value as RiskFlagItem)}
                  onChange={() => toggleRiskFlag(r.value as RiskFlagItem)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!antecedentText.trim() || !consequenceText.trim()}
          className="w-full rounded-md bg-[#111111] text-white py-3 text-sm font-semibold disabled:opacity-50"
        >
          Finish and show code
        </button>
      </div>
    </div>
  )
}
