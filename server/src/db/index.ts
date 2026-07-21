import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

// Strip ?ssl-mode=REQUIRED from URL — mysql2 handles SSL via pool options
let cleanUrl = dbUrl.replace(/[?&]ssl-mode=[^&]*/i, '').replace(/\?$/, '');

// Check for Unix socket (common on cPanel / Linux production environments)
const socketPaths = [
  '/var/lib/mysql/mysql.sock',
  '/tmp/mysql.sock',
  '/var/run/mysqld/mysqld.sock',
  '/var/run/mysql/mysql.sock',
];
const unixSocket = socketPaths.find(s => {
  try { return fs.existsSync(s); } catch { return false; }
});

const isCloud = cleanUrl.includes('aivencloud.com') || cleanUrl.includes('rds.amazonaws.com');

let poolOptions: mysql.PoolOptions;

if (unixSocket && !isCloud) {
  console.log(`🔌 DB target: Unix Socket (${unixSocket})`);
  try {
    const parsed = new URL(cleanUrl);
    poolOptions = {
      socketPath: unixSocket,
      user: decodeURIComponent(parsed.username || 'skyforoo_un'),
      password: decodeURIComponent(parsed.password || '@Sky132435'),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'skyforoo_db',
      connectionLimit: 10,
      connectTimeout: 20000,
    };
  } catch {
    poolOptions = {
      socketPath: unixSocket,
      user: 'skyforoo_un',
      password: '@Sky132435',
      database: 'skyforoo_db',
      connectionLimit: 10,
      connectTimeout: 20000,
    };
  }
} else {
  // Normalize localhost -> 127.0.0.1 for MySQL TCP reliability on Node.js
  if (!isCloud && cleanUrl.includes('@localhost:')) {
    cleanUrl = cleanUrl.replace('@localhost:', '@127.0.0.1:');
  }

  console.log('🔌 DB target:', cleanUrl.replace(/:([^:@]{3})[^:@]*@/, ':***@'), isCloud ? '[SSL]' : '[TCP/IP]');

  poolOptions = {
    uri: cleanUrl,
    connectionLimit: 10,
    connectTimeout: 20000,
    ...(isCloud && {
      ssl: {
        rejectUnauthorized: false,
      },
    }),
  };
}

const poolConnection = mysql.createPool(poolOptions);

export const db = drizzle(poolConnection, { schema, mode: 'default' });
