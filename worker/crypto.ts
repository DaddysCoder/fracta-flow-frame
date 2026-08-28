export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomOtp(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return n.toString().padStart(6, '0')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
