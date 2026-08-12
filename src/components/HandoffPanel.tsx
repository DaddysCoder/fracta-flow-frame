import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { db } from '../lib/db'
import {
  cancelReportInvite,
  cancelScreenerInvite,
  createReportInvite,
  createScreenerInvite,
  importIncidentReport,
  importScreenerResponse,
} from '../lib/actions'
import { decodeResponsePayload } from '../lib/qrPayload'
import { decodeReportPayload } from '../lib/reportPayload'
import type { ReportInvite, ScreenerInvite } from '../lib/types'

const ROLE_OPTIONS = ['Support worker', 'Parent', 'Sibling', 'Teacher', 'Other']

// Generic across screener and incident-report invites (brief §4/§5) — both
// share this exact shape, so generation and the pending-invites list are
// written once and parameterised rather than duplicated per invite type.
function GenerateInviteSection({
  title,
  description,
  onGenerate,
}: {
  title: string
  description: string
  onGenerate: (informantRole: string) => Promise<{ token: string; url: string }>
}) {
  const [role, setRole] = useState(ROLE_OPTIONS[0])
  const [customRole, setCustomRole] = useState('')
  const [invite, setInvite] = useState<{ token: string; url: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const effectiveRole = role === 'Other' ? customRole.trim() || 'Other' : role

  useEffect(() => {
    if (!invite) return
    let cancelled = false
    QRCode.toDataURL(invite.url, { errorCorrectionLevel: 'M', margin: 2, width: 260 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [invite])

  async function handleGenerate() {
    const created = await onGenerate(effectiveRole)
    setInvite(created)
  }

  async function handleCopy() {
    if (!invite) return
    await navigator.clipboard.writeText(invite.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">{title}</h2>
      <p className="text-xs text-slate-500">{description}</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-700 dark:text-slate-200">
          Their role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {role === 'Other' && (
          <input
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Describe their role"
            className="rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
          />
        )}
        <button
          onClick={handleGenerate}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
        >
          Generate invite QR
        </button>
      </div>

      {invite && (
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          {qrDataUrl && <img src={qrDataUrl} alt="Invite QR code" className="rounded-md" />}
          <div className="flex items-center gap-2 w-full">
            <input readOnly value={invite.url} className="flex-1 min-w-0 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-xs" />
            <button onClick={handleCopy} className="shrink-0 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-700 dark:text-slate-200">
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InviteListView({
  invites,
  onCancel,
}: {
  invites: (ScreenerInvite | ReportInvite)[] | undefined
  onCancel: (inviteId: string) => void
}) {
  if (!invites?.length) {
    return <p className="text-sm text-slate-500">No invites generated yet.</p>
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {invites.map((inv) => (
        <li key={inv.id} className="p-3 text-sm flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-[#111111] dark:text-white">
              {inv.informantRole} <span className="text-xs text-slate-400 font-mono">#{inv.token}</span>
            </div>
            <div className="text-xs text-slate-500">
              Created {new Date(inv.createdAt).toLocaleString()} · {inv.status}
            </div>
          </div>
          {inv.status === 'pending' && (
            <button
              onClick={() => onCancel(inv.id)}
              className="shrink-0 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function ScreenerPendingInvitesList({ behaviourId }: { behaviourId: string }) {
  const invites = useLiveQuery(
    () => db.screenerInvites.where('behaviourId').equals(behaviourId).reverse().sortBy('createdAt'),
    [behaviourId],
  )
  return <InviteListView invites={invites} onCancel={cancelScreenerInvite} />
}

function ReportPendingInvitesList({ behaviourId }: { behaviourId: string }) {
  const invites = useLiveQuery(
    () => db.reportInvites.where('behaviourId').equals(behaviourId).reverse().sortBy('createdAt'),
    [behaviourId],
  )
  return <InviteListView invites={invites} onCancel={cancelReportInvite} />
}

type ImportResult = { kind: 'ok'; message: string } | { kind: 'error'; message: string }

// Generic scan-or-paste import UI, shared by the screener and incident-
// report handoff (brief §5). Paste-code is the default, primary path —
// texting/messaging a short code through whatever channel the informant
// and practitioner already use is more realistic than lining up a camera
// scan in person. Camera scanning is opt-in, behind a toggle, not removed.
function ImportCodeSection({
  title,
  onDecodedText,
}: {
  title: string
  onDecodedText: (text: string) => Promise<ImportResult>
}) {
  const [showCamera, setShowCamera] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  async function handleDecodedText(text: string) {
    setResult(await onDecodedText(text))
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  async function startCamera() {
    setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      tick()
    } catch {
      setResult({ kind: 'error', message: 'Camera access was denied or unavailable. Use "Paste code" below instead.' })
    }
  }

  function tick() {
    const video = videoRef.current
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code) {
      stopCamera()
      handleDecodedText(code.data)
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => stopCamera, [])

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">{title}</h2>

      <div className="space-y-2">
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={3}
          placeholder="Paste the code the informant sent you"
          className="block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs font-mono"
        />
        <button
          onClick={() => handleDecodedText(pasteText)}
          disabled={!pasteText.trim()}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Import
        </button>
      </div>

      {!showCamera ? (
        <button
          onClick={() => setShowCamera(true)}
          className="text-sm text-slate-600 dark:text-slate-300 underline"
        >
          Scan a QR code instead
        </button>
      ) : (
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
          {!scanning ? (
            <button
              onClick={startCamera}
              className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
            >
              Start camera scan
            </button>
          ) : (
            <>
              <video ref={videoRef} className="w-full max-w-xs rounded-md" muted playsInline />
              <button onClick={stopCamera} className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
                Stop scanning
              </button>
            </>
          )}
        </div>
      )}

      {result?.kind === 'error' && <p className="text-sm text-red-600">{result.message}</p>}
      {result?.kind === 'ok' && <p className="text-sm text-green-600">{result.message}</p>}
    </div>
  )
}

async function handleScreenerImport(text: string, behaviourId: string): Promise<ImportResult> {
  const decoded = decodeResponsePayload(text)
  if (!decoded.ok) return { kind: 'error', message: decoded.error }

  const outcome = await importScreenerResponse({
    token: decoded.token,
    responses: decoded.responses,
    completedAt: decoded.completedAt,
  })
  if (outcome.status === 'not_found') {
    return { kind: 'error', message: "This code's invite wasn't found. It may be from a different device, or mistyped." }
  }
  if (outcome.status === 'already_used') {
    return { kind: 'error', message: 'This response has already been imported. Importing it again would create a duplicate, so it was rejected.' }
  }
  if (outcome.status === 'cancelled') {
    return { kind: 'error', message: 'This invite was cancelled, so the response cannot be imported.' }
  }
  const sameBehaviour = outcome.behaviourId === behaviourId
  return {
    kind: 'ok',
    message: sameBehaviour
      ? 'Imported successfully.'
      : "Imported successfully — against a different behaviour than this page (the invite's own token determined the destination).",
  }
}

async function handleReportImport(text: string, behaviourId: string): Promise<ImportResult> {
  const decoded = decodeReportPayload(text)
  if (!decoded.ok) return { kind: 'error', message: decoded.error }

  const r = decoded.report
  const outcome = await importIncidentReport({
    token: r.token,
    dateTime: r.dateTime,
    durationMinutes: r.durationMinutes,
    severityRating: r.severityRating,
    frequencyContext: r.frequencyContext,
    settingEvent: r.settingEvent,
    settingEventTags: r.settingEventTags,
    antecedentText: r.antecedentText,
    antecedentTags: r.antecedentTags,
    consequenceText: r.consequenceText,
    consequenceTags: r.consequenceTags,
    riskFlags: r.riskFlags,
  })
  if (outcome.status === 'not_found') {
    return { kind: 'error', message: "This code's invite wasn't found. It may be from a different device, or mistyped." }
  }
  if (outcome.status === 'already_used') {
    return { kind: 'error', message: 'This report has already been imported. Importing it again would create a duplicate episode, so it was rejected.' }
  }
  if (outcome.status === 'cancelled') {
    return { kind: 'error', message: 'This invite was cancelled, so the report cannot be imported.' }
  }
  const sameBehaviour = outcome.behaviourId === behaviourId
  return {
    kind: 'ok',
    message: sameBehaviour
      ? 'Imported successfully as a new episode.'
      : "Imported successfully as a new episode — against a different behaviour than this page (the invite's own token determined the destination).",
  }
}

type HandoffKind = 'screener' | 'report'

export function HandoffPanel({ behaviourId }: { behaviourId: string }) {
  const [kind, setKind] = useState<HandoffKind>('screener')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(['screener', 'report'] as HandoffKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              kind === k
                ? 'border-[#111111] dark:border-white text-[#111111] dark:text-white'
                : 'border-transparent text-slate-500'
            }`}
          >
            {k === 'screener' ? 'Function screener' : 'Incident report'}
          </button>
        ))}
      </div>

      {kind === 'screener' && (
        <>
          <GenerateInviteSection
            title="Invite someone to complete the screener"
            description="No account or app install needed for them — they scan a QR, answer on their own phone, and send you a code when done. No clinical detail travels through the link."
            onGenerate={(informantRole) => createScreenerInvite({ behaviourId, informantRole })}
          />
          <div>
            <h2 className="text-sm font-semibold text-[#111111] dark:text-white mb-2">Pending &amp; past invites</h2>
            <ScreenerPendingInvitesList behaviourId={behaviourId} />
          </div>
          <ImportCodeSection
            title="Import a completed screener"
            onDecodedText={(text) => handleScreenerImport(text, behaviourId)}
          />
        </>
      )}

      {kind === 'report' && (
        <>
          <GenerateInviteSection
            title="Invite someone to report an incident"
            description="For a support worker or other witness to describe something that happened, from their own phone. No clinical detail travels through the link."
            onGenerate={(informantRole) => createReportInvite({ behaviourId, informantRole })}
          />
          <div>
            <h2 className="text-sm font-semibold text-[#111111] dark:text-white mb-2">Pending &amp; past invites</h2>
            <ReportPendingInvitesList behaviourId={behaviourId} />
          </div>
          <ImportCodeSection
            title="Import a completed incident report"
            onDecodedText={(text) => handleReportImport(text, behaviourId)}
          />
        </>
      )}
    </div>
  )
}
