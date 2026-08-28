import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { db } from '../lib/db'
import { cancelScreenerInvite, createScreenerInvite, importScreenerResponse } from '../lib/actions'
import { decodeResponsePayload } from '../lib/qrPayload'
import { useEntitlement } from '../context/AuthContext'
import { canUseProFeature } from '../../shared/entitlement'
import { ProBadge, ProGate } from './ProGate'

const ROLE_OPTIONS = ['Support worker', 'Parent', 'Sibling', 'Teacher', 'Other']

function GenerateInviteSection({ behaviourId }: { behaviourId: string }) {
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
    const created = await createScreenerInvite({ behaviourId, informantRole: effectiveRole })
    setInvite({ token: created.token, url: created.url })
  }

  async function handleCopy() {
    if (!invite) return
    await navigator.clipboard.writeText(invite.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Invite someone to complete the screener</h2>
      <p className="text-xs text-slate-500">
        No account or app install needed for them — they scan a QR, answer on their own phone,
        and show you a second QR when done. No clinical detail travels through the link.
      </p>
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

function PendingInvitesList({ behaviourId }: { behaviourId: string }) {
  const invites = useLiveQuery(
    () => db.screenerInvites.where('behaviourId').equals(behaviourId).reverse().sortBy('createdAt'),
    [behaviourId],
  )

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
              onClick={() => cancelScreenerInvite(inv.id)}
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

type ScanResult = { kind: 'ok'; behaviourId: string; sameBehaviour: boolean } | { kind: 'error'; message: string }

function ScanImportSection({ behaviourId }: { behaviourId: string }) {
  const [scanning, setScanning] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  async function handleDecodedText(text: string) {
    const decoded = decodeResponsePayload(text)
    if (!decoded.ok) {
      setResult({ kind: 'error', message: decoded.error })
      return
    }
    const outcome = await importScreenerResponse({
      token: decoded.token,
      responses: decoded.responses,
      completedAt: decoded.completedAt,
    })
    if (outcome.status === 'not_found') {
      setResult({ kind: 'error', message: "This code's invite wasn't found. It may be from a different device, or mistyped." })
    } else if (outcome.status === 'already_used') {
      setResult({ kind: 'error', message: 'This response has already been imported. Scanning it again would create a duplicate, so it was rejected.' })
    } else if (outcome.status === 'cancelled') {
      setResult({ kind: 'error', message: 'This invite was cancelled, so the response cannot be imported.' })
    } else {
      setResult({ kind: 'ok', behaviourId: outcome.behaviourId, sameBehaviour: outcome.behaviourId === behaviourId })
    }
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
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Scan a completed response</h2>

      {!scanning ? (
        <button
          onClick={startCamera}
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
        >
          Start camera scan
        </button>
      ) : (
        <div className="space-y-2">
          <video ref={videoRef} className="w-full max-w-xs rounded-md" muted playsInline />
          <button onClick={stopCamera} className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
            Stop scanning
          </button>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-slate-600 dark:text-slate-300">Can't scan? Paste the code instead</summary>
        <div className="mt-2 space-y-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={3}
            placeholder="Paste the text shown under the informant's QR code"
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
      </details>

      {result?.kind === 'error' && <p className="text-sm text-red-600">{result.message}</p>}
      {result?.kind === 'ok' && (
        <p className="text-sm text-green-600">
          Imported successfully{result.sameBehaviour ? '.' : ' — against a different behaviour than this page (the invite\'s own token determined the destination).'}
        </p>
      )}
    </div>
  )
}

export function HandoffPanel({ behaviourId }: { behaviourId: string }) {
  const entitlement = useEntitlement()
  const allowed = canUseProFeature('multi_informant_qr', entitlement)

  return (
    <ProGate allowed={allowed} feature="Multi-informant QR screener">
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500 flex-1">
          This tab is for the function screener only. Episode capture from the floor is Field, on
          the Episode log tab — same behaviour record.
        </p>
        {!allowed && <ProBadge />}
      </div>
      <GenerateInviteSection behaviourId={behaviourId} />
      <div>
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white mb-2">Pending &amp; past invites</h2>
        <PendingInvitesList behaviourId={behaviourId} />
      </div>
      <ScanImportSection behaviourId={behaviourId} />
    </div>
    </ProGate>
  )
}
