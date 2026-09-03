import { type FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { encodeFieldCapture, newCaptureId } from '../lib/fieldPayload'
import {
  ANTECEDENT_TAGS,
  CONSEQUENCE_TAGS,
  FREQUENCY_SCALE,
  RISK_FLAG_OPTIONS,
  SEVERITY_SCALE,
} from '../lib/scales'
import type { AntecedentTag, ConsequenceTag, RiskFlagItem } from '../lib/types'
import { ProfessionalToolDisclaimer } from '../components/ProfessionalToolDisclaimer'

function nowLocal(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const inputClass =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'

export function FieldCapturePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const role = searchParams.get('role') || 'support worker'

  const [dateTime, setDateTime] = useState(nowLocal())
  const [durationMinutes, setDurationMinutes] = useState('')
  const [severityRating, setSeverityRating] = useState<0 | 1 | 2 | 3>(0)
  const [frequencyContext, setFrequencyContext] = useState<0 | 1 | 2 | 3 | 4>(0)
  const [settingEvent, setSettingEvent] = useState('')
  const [antecedentText, setAntecedentText] = useState('')
  const [antecedentTag, setAntecedentTag] = useState<AntecedentTag>('unknown')
  const [consequenceText, setConsequenceText] = useState('')
  const [consequenceTag, setConsequenceTag] = useState<ConsequenceTag>('none_observed')
  const [riskFlags, setRiskFlags] = useState<RiskFlagItem[]>([])
  const [payloadText, setPayloadText] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
          <h1 className="text-lg font-display font-bold text-[#111111]">This Field link isn&apos;t ready</h1>
          <p className="text-sm text-slate-600">
            Ask the practitioner for a fresh Field QR. This page never sees who the participant
            is — only they know which behaviour you are logging.
          </p>
        </div>
      </div>
    )
  }

  function resetForm() {
    setDateTime(nowLocal())
    setDurationMinutes('')
    setSeverityRating(0)
    setFrequencyContext(0)
    setSettingEvent('')
    setAntecedentText('')
    setAntecedentTag('unknown')
    setConsequenceText('')
    setConsequenceTag('none_observed')
    setRiskFlags([])
    setPayloadText(null)
    setQrDataUrl(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!antecedentText.trim() || !consequenceText.trim()) return
    setPayloadText(
      encodeFieldCapture({
        token: token!,
        captureId: newCaptureId(),
        episode: {
          dateTime: new Date(dateTime).toISOString(),
          durationMinutes: durationMinutes ? Number(durationMinutes) : null,
          severityRating,
          frequencyContext,
          settingEvent,
          antecedentText,
          antecedentTag,
          consequenceText,
          consequenceTag,
          riskFlags,
        },
      }),
    )
  }

  if (payloadText) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#F5F5F5] p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-lg font-display font-bold text-[#111111]">Show this to the practitioner</h1>
          <p className="text-sm text-slate-600">
            They scan it into Frame. It lands on the same episode log — not a second caseload.
            Nothing you typed was sent to a server.
          </p>
          {qrDataUrl && <img src={qrDataUrl} alt="Field capture QR" className="mx-auto rounded-md" />}
          <details className="text-left text-sm">
            <summary className="cursor-pointer text-slate-600">Can&apos;t scan? Copy text</summary>
            <textarea readOnly value={payloadText} rows={6} className="mt-2 w-full text-xs font-mono rounded-md border p-2" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(payloadText)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="mt-2 rounded-md bg-[#111111] text-white px-3 py-1.5 text-sm"
            >
              {copied ? 'Copied' : 'Copy text'}
            </button>
          </details>
          <button type="button" onClick={resetForm} className="text-sm underline text-slate-600">
            Log another episode on this link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#F5F5F5] p-4">
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">Field by WhatBit</p>
          <h1 className="text-lg font-display font-bold text-[#111111] mt-1">Log an episode</h1>
          <p className="text-sm text-slate-600 mt-1">
            You&apos;re logging as a {role}. This stays on your phone until you show the code.
          </p>
          <ProfessionalToolDisclaimer className="mt-2" />
        </div>

        <label className="block text-sm font-medium">
          Date &amp; time
          <input type="datetime-local" required value={dateTime} onChange={(e) => setDateTime(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Duration (minutes, optional)
          <input type="number" min={0} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Setting event
          <input value={settingEvent} onChange={(e) => setSettingEvent(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Antecedent
          <textarea required rows={2} value={antecedentText} onChange={(e) => setAntecedentText(e.target.value)} className={inputClass} />
        </label>
        <select value={antecedentTag} onChange={(e) => setAntecedentTag(e.target.value as AntecedentTag)} className={inputClass}>
          {ANTECEDENT_TAGS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label className="block text-sm font-medium">
          Consequence
          <textarea required rows={2} value={consequenceText} onChange={(e) => setConsequenceText(e.target.value)} className={inputClass} />
        </label>
        <select value={consequenceTag} onChange={(e) => setConsequenceTag(e.target.value as ConsequenceTag)} className={inputClass}>
          {CONSEQUENCE_TAGS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Severity</legend>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_SCALE.map((s) => (
              <label key={s.value} className={`cursor-pointer rounded-md border px-2 py-1.5 text-xs ${severityRating === s.value ? 'bg-[#111111] text-white border-[#111111]' : 'border-slate-300'}`}>
                <input type="radio" className="sr-only" checked={severityRating === s.value} onChange={() => setSeverityRating(s.value as 0 | 1 | 2 | 3)} />
                {s.value} — {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Frequency / context</legend>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_SCALE.map((f) => (
              <label key={f.value} className={`cursor-pointer rounded-md border px-2 py-1.5 text-xs ${frequencyContext === f.value ? 'bg-[#111111] text-white border-[#111111]' : 'border-slate-300'}`}>
                <input type="radio" className="sr-only" checked={frequencyContext === f.value} onChange={() => setFrequencyContext(f.value as 0 | 1 | 2 | 3 | 4)} />
                {f.value} — {f.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium mb-1">Risk flags</legend>
          <div className="flex flex-wrap gap-3">
            {RISK_FLAG_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={riskFlags.includes(r.value as RiskFlagItem)}
                  onChange={() =>
                    setRiskFlags((prev) =>
                      prev.includes(r.value as RiskFlagItem) ? prev.filter((f) => f !== r.value) : [...prev, r.value as RiskFlagItem],
                    )
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="w-full rounded-md bg-[#111111] text-white py-3 text-sm font-semibold">
          Finish and show code
        </button>
      </form>
    </div>
  )
}
