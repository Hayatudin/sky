import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'mysql',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,             // 5 min client-side cache
    },
  },

  trustedOrigins: [
    'http://localhost:3000',
    // Dynamically loaded from TRUSTED_ORIGINS env var (comma-separated)
    ...(process.env.TRUSTED_ORIGINS
      ? process.env.TRUSTED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
      : []),
  ],

  advanced: {
    basePath: '/api/auth',
    useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false,
    defaultCookieAttributes: {
      sameSite: (process.env.BETTER_AUTH_URL?.startsWith('https://') ? "none" : "lax") as "none" | "lax",
      secure: process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false,
      // Allow cookie to be sent from frontend (skyforeignagency.com) to API (api.skyforeignagency.com)
      domain: process.env.BETTER_AUTH_URL?.startsWith('https://') ? '.skyforeignagency.com' : undefined,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
      agency: {
        type: 'string',
        required: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
