import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { verifyOtp, requestOtp } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const { refresh, setTrialWelcome } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/billing'

  async function handleEmail(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await requestOtp(email.trim())
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code')
    } finally {
      setPending(false)
    }
  }

  async function handleCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const result = await verifyOtp(email.trim(), code.trim())
      await refresh()
      if (result.message) setTrialWelcome(result.message)
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <LegalLayout title="Sign in to Frame">
      <p className="text-[#6B6B6B]">
        Frame Free needs no account. Sign in only for Frame Pro trial, subscription, or billing management.
        We send a one-time 6-digit code — no password.
      </p>

      {step === 'email' ? (
        <form onSubmit={handleEmail} className="space-y-4 not-prose">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-[#E8542E] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send sign-in code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCode} className="space-y-4 not-prose">
          <p className="text-sm text-slate-500">Code sent to {email}</p>
          <label className="block text-sm font-medium">
            6-digit code
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm tracking-widest font-mono"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending || code.length !== 6}
              className="rounded-md bg-[#E8542E] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {pending ? 'Verifying…' : 'Verify & continue'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
              }}
              className="text-sm text-slate-500 underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-sm text-slate-500 pt-4">
        <Link to="/pricing" className="text-[#E8542E] hover:underline">
          Compare Frame Free and Frame Pro
        </Link>
        {' · '}
        <Link to="/" className="text-[#E8542E] hover:underline">
          Continue without signing in
        </Link>
      </p>
    </LegalLayout>
  )
}
