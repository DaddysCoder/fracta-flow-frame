import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { SCREENER_DISPLAY_ITEMS, SCREENER_ITEMS } from '../lib/screener'
import { encodeResponsePayload } from '../lib/qrPayload'
import type { ScreenerAnswer, ScreenerResponse } from '../lib/types'

// Informant-facing standalone page (brief §4). No IndexedDB, no nav chrome,
// no idea who the participant is or which clinical record this feeds —
// the informant already knows which behaviour they're rating because the
// practitioner told them directly. Handles the "no token / malformed URL"
// case explicitly (the same bug class as the Phase 1 useLiveQuery issue:
// never leave an ambiguous loading/blank state unexplained).
export function InformantScreenerPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')
  const role = searchParams.get('role') || 'informant'

  const [answers, setAnswers] = useState<Record<string, ScreenerAnswer>>({})
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [payloadText, setPayloadText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const allAnswered = SCREENER_ITEMS.every((item) => answers[item.id])

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
    if (!token || !allAnswered) return
    const responses: ScreenerResponse[] = SCREENER_ITEMS.map((item) => ({
      itemId: item.id,
      domain: item.domain,
      answer: answers[item.id],
    }))
    const completedAt = new Date().toISOString()
    setPayloadText(encodeResponsePayload(token, responses, completedAt))
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
            Show this code to the practitioner so they can scan it into their app.
          </p>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Completed screener response code" className="mx-auto rounded-lg border border-slate-200" />
          ) : (
            <p className="text-sm text-slate-500">Generating code…</p>
          )}
          <details className="text-left text-xs text-slate-500">
            <summary className="cursor-pointer">Can't scan? Copy the code as text instead</summary>
            <textarea readOnly value={payloadText} className="mt-2 w-full rounded border border-slate-300 p-2 font-mono text-[10px]" rows={3} />
            <button onClick={handleCopy} className="mt-1 rounded bg-[#111111] text-white px-3 py-1 text-xs">
              {copied ? 'Copied' : 'Copy text'}
            </button>
          </details>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#F5F5F5] p-4">
      <div className="max-w-lg mx-auto space-y-4 py-4">
        <div>
          <h1 className="text-lg font-display font-bold text-[#111111]">Behaviour screener</h1>
          <p className="text-sm text-slate-600 mt-1">
            You've been asked (as a {role}) to answer some quick yes/no/unsure questions about a
            behaviour. This takes about 3 minutes. Nothing you enter is sent anywhere — when
            you're done you'll get a code to show back to the practitioner.
          </p>
        </div>

        <div className="space-y-3">
          {SCREENER_DISPLAY_ITEMS.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
              <p className="text-sm text-slate-800">{item.prompt}</p>
              <div className="flex gap-1">
                {(['yes', 'unsure', 'no'] as ScreenerAnswer[]).map((opt) => (
                  <label
                    key={opt}
                    className={`flex-1 text-center cursor-pointer rounded-md border px-2 py-1.5 text-xs capitalize ${
                      answers[item.id] === opt
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name={item.id}
                      className="sr-only"
                      checked={answers[item.id] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [item.id]: opt }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full rounded-md bg-[#111111] text-white py-3 text-sm font-semibold disabled:opacity-50"
        >
          {allAnswered ? 'Finish and show code' : 'Answer all questions to finish'}
        </button>
      </div>
    </div>
  )
}
