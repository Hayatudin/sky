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

// Normalize localhost -> 127.0.0.1 for MySQL TCP connection reliability on cPanel / Linux
let cleanUrl = dbUrl.replace(/[?&]ssl-mode=[^&]*/i, '').replace(/\?$/, '');
if (!cleanUrl.includes('aivencloud.com') && cleanUrl.includes('@localhost:')) {
  cleanUrl = cleanUrl.replace('@localhost:', '@127.0.0.1:');
}

// SSL enabled only if external cloud host requires it
const needsSsl = dbUrl.includes('aivencloud.com');

console.log('🔌 DB target:', cleanUrl.replace(/:([^:@]{3})[^:@]*@/, ':***@'), needsSsl ? '[SSL]' : '[cPanel / Local MySQL]');

const poolConnection = mysql.createPool({
  uri: cleanUrl,
  connectionLimit: 10,
  connectTimeout: 20000,
  ...(needsSsl && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
