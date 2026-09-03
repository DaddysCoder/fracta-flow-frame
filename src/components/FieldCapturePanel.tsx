import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { db } from '../lib/db'
import { cancelFieldInvite, createFieldInvite, importFieldCaptureText } from '../lib/actions'
import { ProfessionalToolDisclaimer } from './ProfessionalToolDisclaimer'

const ROLE_OPTIONS = ['Support worker', 'Parent', 'Sibling', 'Teacher', 'Other']

export function FieldCapturePanel({ behaviourId }: { behaviourId: string }) {
  const [role, setRole] = useState(ROLE_OPTIONS[0])
  const [customRole, setCustomRole] = useState('')
  const [invite, setInvite] = useState<{ token: string; url: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  const invites = useLiveQuery(
    () => db.fieldInvites.where('behaviourId').equals(behaviourId).reverse().sortBy('createdAt'),
    [behaviourId],
  )

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

  async function handleDecodedText(text: string) {
    setMessage(null)
    try {
      const outcome = await importFieldCaptureText(text)
      if (outcome.status === 'not_found') {
        setMessage({ kind: 'error', text: "This Field invite wasn't found on this device." })
      } else if (outcome.status === 'already_used') {
        setMessage({ kind: 'error', text: 'This capture was already imported. The duplicate was rejected.' })
      } else if (outcome.status === 'cancelled') {
        setMessage({ kind: 'error', text: 'This Field invite was cancelled.' })
      } else {
        setMessage({
          kind: 'ok',
          text: outcome.behaviourId === behaviourId
            ? 'Imported onto this episode log.'
            : 'Imported onto a different behaviour (the invite token decided the destination).',
        })
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Import failed' })
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  async function startCamera() {
    setMessage(null)
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
      setMessage({ kind: 'error', text: 'Camera unavailable. Paste the code instead.' })
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
      void handleDecodedText(code.data)
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => stopCamera, [])

  return (
    <div className="rounded-2xl border border-[#E5E5E5] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[#0B0B0C] dark:text-white">Field capture</h2>
        <p className="text-xs text-slate-500 mt-1">
          Someone on the floor logs an episode on their phone. You scan their code. It becomes an
          episode on this behaviour — same caseload, not a Field database.
        </p>
        <ProfessionalToolDisclaimer className="mt-2" />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-700 dark:text-slate-200">
          Their role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
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
          type="button"
          onClick={async () => {
            const created = await createFieldInvite({ behaviourId, informantRole: effectiveRole })
            setInvite({ token: created.token, url: created.url })
          }}
          className="rounded-md bg-[#0B0B0C] dark:bg-white text-white dark:text-[#0B0B0C] px-3 py-1.5 text-sm font-medium"
        >
          Generate Field QR
        </button>
      </div>

      {invite && (
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          {qrDataUrl && <img src={qrDataUrl} alt="Field invite QR" className="rounded-md" />}
          <div className="flex items-center gap-2 w-full">
            <input readOnly value={invite.url} className="flex-1 min-w-0 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-xs" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(invite.url)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="shrink-0 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <p className="text-xs text-slate-400">This link stays open for more than one episode until you cancel it.</p>
        </div>
      )}

      {!!invites?.length && (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
          {invites.map((inv) => (
            <li key={inv.id} className="p-3 text-sm flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-[#0B0B0C] dark:text-white">
                  {inv.informantRole} <span className="text-xs text-slate-400 font-mono">#{inv.token}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {inv.status} · {inv.importedCaptureIds.length} imported
                </div>
              </div>
              {inv.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => cancelFieldInvite(inv.id)}
                  className="shrink-0 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs"
                >
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-medium">Import a Field code</h3>
        {!scanning ? (
          <button type="button" onClick={startCamera} className="rounded-md bg-[#0B0B0C] dark:bg-white text-white dark:text-[#0B0B0C] px-3 py-1.5 text-sm font-medium">
            Start camera scan
          </button>
        ) : (
          <div className="space-y-2">
            <video ref={videoRef} className="w-full max-w-xs rounded-md" muted playsInline />
            <button type="button" onClick={stopCamera} className="rounded-md border px-3 py-1.5 text-sm">Stop scanning</button>
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600">Paste code instead</summary>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            className="mt-2 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs font-mono"
          />
          <button
            type="button"
            disabled={!pasteText.trim()}
            onClick={() => handleDecodedText(pasteText)}
            className="mt-2 rounded-md bg-[#0B0B0C] dark:bg-white text-white dark:text-[#0B0B0C] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Import
          </button>
        </details>
        {message?.kind === 'error' && <p className="text-sm text-red-600">{message.text}</p>}
        {message?.kind === 'ok' && <p className="text-sm text-green-600">{message.text}</p>}
      </div>
    </div>
  )
}
