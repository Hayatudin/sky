import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// DATABASE_URL from .env — password @ is percent-encoded as %40 in the URL
let dbUrl = process.env.DATABASE_URL || 'mysql://skyforoo_un:%40Sky132435@127.0.0.1:3306/skyforoo_db';

// FAIL-SAFE: When running on cPanel production, always use the local TCP connection
// to avoid firewall blocks on remote cloud database ports.
const isCPanel =
  process.env.HOME?.includes('skyforoo') ||
  process.env.USER === 'skyforoo' ||
  process.env.PWD?.includes('skyforoo') ||
  process.env.BETTER_AUTH_URL?.includes('skyforoo') ||
  // fallback: any URL that isn't localhost means we're remote, switch to local
  (!!process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.includes('localhost'));

if (isCPanel && (dbUrl.includes('aivencloud.com') || dbUrl.includes('mysql.sock'))) {
  console.log('🤖 Drizzle: cPanel detected — switching to local MySQL connection...');
  dbUrl = 'mysql://skyforoo_un:%40Sky132435@127.0.0.1:3306/skyforoo_db';
}

const poolConnection = mysql.createPool({
  uri: dbUrl,
  connectionLimit: 10,
  connectTimeout: 10000,
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
