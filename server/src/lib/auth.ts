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
    // Production — add your actual Vercel URL and custom domain here
    process.env.CLIENT_URL || 'http://localhost:3000',
  ].filter(Boolean) as string[],

  advanced: {
    basePath: '/api/auth',
    useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false,
    defaultCookieAttributes: {
      sameSite: (process.env.BETTER_AUTH_URL?.startsWith('https://') ? "none" : "lax") as "none" | "lax",
      secure: process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false,
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
