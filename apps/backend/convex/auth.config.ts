import type { AuthConfig } from 'convex/server'

/** Clerk issues Convex tokens from its "convex" JWT template (aud: convex). */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig
