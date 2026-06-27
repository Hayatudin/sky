import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let dbUrl = process.env.DATABASE_URL || '';

// FAIL-SAFE: Automatically swap to the local cPanel MySQL database
// if running in the production cPanel environment to prevent firewall hangs/timeouts.
const isCPanel =
  process.env.HOME?.includes('coolstou') ||
  process.env.USER === 'coolstou' ||
  process.env.PWD?.includes('coolstou') ||
  process.env.BETTER_AUTH_URL?.includes('coolstaffagency.com');

if (isCPanel && (!dbUrl || dbUrl.includes('aivencloud.com') || dbUrl.includes('mysql.sock'))) {
  console.log('🤖 Drizzle: Auto-detect: Running on cPanel production. Swapping to local TCP database connection...');
  dbUrl = 'mysql://coolstou_coolstaff:%40Cool132435@127.0.0.1:3306/coolstou_db';
}

const poolConnection = mysql.createPool({
  uri: dbUrl,
  connectionLimit: 10,
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
