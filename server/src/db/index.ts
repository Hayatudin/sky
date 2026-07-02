import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let dbUrl = process.env.DATABASE_URL || '';

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set in .env');
}

// cPanel production auto-detect: switch to local MySQL when running on the server
const isCPanel =
  process.env.HOME?.includes('skyforoo') ||
  process.env.USER === 'skyforoo' ||
  process.env.PWD?.includes('skyforoo');

if (isCPanel && !dbUrl.includes('127.0.0.1') && !dbUrl.includes('localhost')) {
  console.log('🤖 cPanel detected — switching to local MySQL (127.0.0.1)');
  dbUrl = 'mysql://skyforoo_un:%40Sky132435@127.0.0.1:3306/skyforoo_db';
}

// Strip ?ssl-mode=REQUIRED from URL — mysql2 doesn't support this query param.
// SSL is handled via pool options below.
const cleanUrl = dbUrl.replace(/[?&]ssl-mode=[^&]*/i, '').replace(/\?$/, '');

// Only enable SSL for Aiven cloud — cPanel localhost does not need SSL
const needsSsl = dbUrl.includes('aivencloud.com');

console.log('🔌 DB target:', cleanUrl.replace(/:([^:@]{3})[^:@]*@/, ':***@'), needsSsl ? '[SSL]' : '[no SSL]');

const poolConnection = mysql.createPool({
  uri: cleanUrl,
  connectionLimit: 5,
  connectTimeout: 10000,
  ...(needsSsl && {
    ssl: {
      // Aiven uses its own CA — set rejectUnauthorized to false for compatibility
      // This still encrypts the connection, just doesn't verify the CA chain
      rejectUnauthorized: false,
    },
  }),
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
