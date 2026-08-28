import type { Env } from './types'

/** Transactional OTP email — server-side only. Uses Resend when configured. */
export async function sendOtpEmail(env: Env, email: string, code: string): Promise<void> {
  const subject = `${code} is your Frame sign-in code`
  const text = [
    'Your Frame sign-in code',
    '',
    code,
    '',
    'This code expires in 10 minutes and can only be used once.',
    'If you did not request this, you can ignore this email.',
    '',
    '— Frame by WhatBit',
  ].join('\n')

  if (!env.RESEND_API_KEY) {
    // Dev / pre-launch without mail configured — never log the code in production observability.
    console.info('[frame-auth] OTP email skipped (RESEND_API_KEY not set)')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Frame <hello@frame.whatbit.dev>',
      to: [email],
      subject,
      text,
    }),
  })

  if (!res.ok) {
    console.error('[frame-auth] OTP email failed', res.status)
    throw new Error('Unable to send sign-in email right now.')
  }
}
