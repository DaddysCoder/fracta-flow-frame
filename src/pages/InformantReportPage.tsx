import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { encodeReportPayload } from '../lib/reportPayload'
import { ANTECEDENT_ITEMS, CONSEQUENCE_ITEMS, FREQUENCY_SCALE, RISK_FLAG_OPTIONS, SETTING_EVENT_ITEMS } from '../lib/scales'
import type { RiskFlagItem } from '../lib/types'

function nowLocal(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
}

// Informant-facing standalone page for incident/ABC reporting (Phase 1.2
// §4, extends Phase 4's /screener pattern). No IndexedDB, no nav chrome.
//
// Deliberately offers only the generic starter checklists (scales.ts), not
// the requesting behaviour's actual per-behaviour dynamic checklist — see
// reportPayload.ts's header comment for the full design-decision writeup
// (option b, chosen over encoding per-behaviour options into the invite QR).
// No "Other"/custom-item entry here either: an anonymous informant isn't
// positioned to decide a custom consequence item's FAST domain, and the
// compact index-based payload can only represent the fixed starter lists
// anyway — free text below still captures anything the checklist misses.
export function InformantReportPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const role = searchParams.get('role') || 'informant'

  const [dateTime, setDateTime] = useState(nowLocal())
  const [durationMinutes, setDurationMinutes] = useState('')
  const [severityRating, setSeverityRating] = useState<0 | 1 | 2 | 3>(0)
  const [frequencyContext, setFrequencyContext] = useState<0 | 1 | 2 | 3 | 4>(0)
  const [settingEvent, setSettingEvent] = useState('')
  const [settingEventTags, setSettingEventTags] = useState<string[]>([])
  const [antecedentText, setAntecedentText] = useState('')
  const [antecedentTags, setAntecedentTags] = useState<string[]>([])
  const [consequenceText, setConsequenceText] = useState('')
  const [consequenceTags, setConsequenceTags] = useState<string[]>([])
  const [riskFlags, setRiskFlags] = useState<RiskFlagItem[]>([])

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [payloadText, setPayloadText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!payloadText) return
    let cancelled = false
    QRCode.toDataURL(payloadText, { errorCorrectionLevel: 'M', margin: 2, width: 420 })
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
    if (!token) return
    const completedAt = new Date().toISOString()
    setPayloadText(
      encodeReportPayload(
        token,
        {
          dateTime: new Date(dateTime).toISOString(),
          durationMinutes: durationMinutes ? Number(durationMinutes) : null,
          severityRating,
          frequencyContext,
          settingEvent,
          settingEventTags,
          antecedentText,
          antecedentTags,
          consequenceText,
          consequenceTags,
          riskFlags,
        },
        completedAt,
      ),
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
            Send this code back to the practitioner however's easiest — text, email, or let them
            scan the QR below.
          </p>
          <div className="space-y-2">
            <textarea readOnly value={payloadText} className="w-full rounded border border-slate-300 p-2 font-mono text-[10px]" rows={3} />
            <button onClick={handleCopy} className="w-full rounded-md bg-[#111111] text-white py-2 text-sm font-semibold">
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>
          <details className="text-left text-xs text-slate-500">
            <summary className="cursor-pointer">Or show this QR code instead</summary>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Completed incident report code" className="mx-auto mt-2 rounded-lg border border-slate-200" />
            ) : (
              <p className="mt-2 text-slate-500">Generating code…</p>
            )}
          </details>
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
            You've been asked (as a {role}) to describe something that happened. Nothing you enter
            is sent anywhere — when you're done you'll get a code to send back to the
            practitioner.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">
            Date &amp; time
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Duration (minutes, optional)
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
          <label className="block text-sm font-medium text-slate-700">
            Setting event (what was going on beforehand)
            <input
              value={settingEvent}
              onChange={(e) => setSettingEvent(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {SETTING_EVENT_ITEMS.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settingEventTags.includes(item)}
                  onChange={() => setSettingEventTags((prev) => toggle(prev, item))}
                />
                {item}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            What happened right before
            <textarea
              value={antecedentText}
              onChange={(e) => setAntecedentText(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {ANTECEDENT_ITEMS.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={antecedentTags.includes(item)}
                  onChange={() => setAntecedentTags((prev) => toggle(prev, item))}
                />
                {item}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            What happened right after
            <textarea
              value={consequenceText}
              onChange={(e) => setConsequenceText(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {CONSEQUENCE_ITEMS.map((item) => (
              <label key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={consequenceTags.includes(item.label)}
                  onChange={() => setConsequenceTags((prev) => toggle(prev, item.label))}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1">
            Severity (how big a deal was it)
          </span>
          <div className="flex flex-wrap gap-2">
            {([0, 1, 2, 3] as const).map((v) => (
              <label
                key={v}
                className={`cursor-pointer rounded-md border px-2 py-1.5 text-xs ${
                  severityRating === v ? 'border-[#111111] bg-[#111111] text-white' : 'border-slate-300 text-slate-700'
                }`}
              >
                <input type="radio" name="severity" className="sr-only" checked={severityRating === v} onChange={() => setSeverityRating(v)} />
                {v}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1">
            Frequency / context (how often this happens)
          </span>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_SCALE.map((f) => (
              <label
                key={f.value}
                className={`cursor-pointer rounded-md border px-2 py-1.5 text-xs ${
                  frequencyContext === f.value ? 'border-[#111111] bg-[#111111] text-white' : 'border-slate-300 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  className="sr-only"
                  checked={frequencyContext === f.value}
                  onChange={() => setFrequencyContext(f.value as 0 | 1 | 2 | 3 | 4)}
                />
                {f.value} — {f.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1">Risk flags</span>
          <div className="flex flex-wrap gap-3">
            {RISK_FLAG_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={riskFlags.includes(r.value as RiskFlagItem)}
                  onChange={() =>
                    setRiskFlags((prev) =>
                      prev.includes(r.value as RiskFlagItem)
                        ? prev.filter((f) => f !== r.value)
                        : [...prev, r.value as RiskFlagItem],
                    )
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} className="w-full rounded-md bg-[#111111] text-white py-3 text-sm font-semibold">
          Finish and get code
        </button>
      </div>
    </div>
  )
}
