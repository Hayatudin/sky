import { Request } from 'express';
import { auth } from './auth';
import { fromNodeHeaders } from 'better-auth/node';
import { db } from '../db';
import { session as sessionTable, user as userTable } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function getSession(req: Request) {
  // Strategy 0: Bearer token from Authorization header (cross-domain deployments)
  // Frontend sends: Authorization: Bearer <session_token>
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const now = new Date();
        const [sessionRow] = await db
          .select({
            id: sessionTable.id,
            userId: sessionTable.userId,
            expiresAt: sessionTable.expiresAt,
            token: sessionTable.token,
          })
          .from(sessionTable)
          .where(and(eq(sessionTable.token, token), gt(sessionTable.expiresAt, now)))
          .limit(1);

        if (sessionRow) {
          const [userRow] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, sessionRow.userId))
            .limit(1);

          if (userRow) {
            console.log('[AUTH-HELPER] Bearer token authenticated:', userRow.email);
            return {
              session: { id: sessionRow.id, userId: sessionRow.userId, expiresAt: sessionRow.expiresAt },
              user: userRow,
            };
          }
        }
      } catch (err) {
        console.warn('[AUTH-HELPER] Bearer token lookup failed:', err);
      }
    }
  }

  // Strategy 1: Better Auth's official fromNodeHeaders (cookie-based)
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session) return session;
  } catch (err) {
    console.warn('[AUTH-HELPER] Strategy 1 (fromNodeHeaders) failed:', err);
  }

  // Strategy 2: Raw headers
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });
    if (session) return session;
  } catch (err) {
    console.warn('[AUTH-HELPER] Strategy 2 (raw headers) failed:', err);
  }

  // Strategy 3: Manual Headers mapping
  try {
    const webHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach(v => webHeaders.append(key, v));
      } else if (value) {
        webHeaders.set(key, value);
      }
    }
    const session = await auth.api.getSession({ headers: webHeaders });
    if (session) return session;
  } catch (err) {
    console.warn('[AUTH-HELPER] Strategy 3 (manual Headers) failed:', err);
  }

  return null;
}
