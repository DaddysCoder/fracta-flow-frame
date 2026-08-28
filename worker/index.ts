import { handleAuthRequest } from './auth'
import { handleBillingRequest, handleEntitlementRequest, handleStripeWebhook } from './billing'
import { errorResponse, type Env } from './types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (path.startsWith('/api/')) {
      if (path === '/api/webhooks/stripe' && request.method === 'POST') {
        return handleStripeWebhook(request, env)
      }

      const auth = await handleAuthRequest(request, env, path)
      if (auth) return auth

      const billing = await handleBillingRequest(request, env, path)
      if (billing) return billing

      const entitlement = await handleEntitlementRequest(request, env, path)
      if (entitlement) return entitlement

      return errorResponse('Not found', 404)
    }

    return env.ASSETS.fetch(request)
  },
}

export type { Env }
