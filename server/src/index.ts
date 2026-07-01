import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Mount Helmet for basic HTTP security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin asset loading (e.g. photos/videos)
    contentSecurityPolicy: false, // Turn off CSP if frontend/SPA is hosted elsewhere or using inline assets
  })
);

// CORS Whitelist configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:4000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
}));

app.use(cookieParser());

// Better Auth handler — MUST come before body parsers
import { auth } from './lib/auth';
import { ensureDatabaseSchema } from './lib/db-healing';
import { db } from './db';
import { user, candidate } from './db/schema';
import { sql } from 'drizzle-orm';

// Manual auth handler — reads raw body stream then delegates to better-auth.
// Using toNodeHandler() from better-call causes a res.writeHead-after-setHeader
// bug in Express 4 that silently returns 500 on all POST requests.
app.all('/api/auth/*', async (req: Request, res: Response) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.socket && (req.socket as any).encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] as string || req.headers['host'] || 'localhost:4000';
  const base = `${proto}://${host}`;
  const url = `${base}${req.originalUrl}`;

  // Build web-standard Headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
    else if (value) headers.set(key, value as string);
  }

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  try {
    const request = new globalThis.Request(url, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });

    const response = await auth.handler(request);

    // Write status + headers — avoid calling both setHeader and writeHead
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        res.append('Set-Cookie', value);
      } else {
        res.setHeader(key, value);
      }
    });

    const responseBody = await response.text();
    res.end(responseBody);
  } catch (err: any) {
    console.error('[AUTH] handler error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Internal auth error' }));
    }
  }
});

// Body parsers — AFTER auth handler (express.json drains the stream)
app.use(express.json({ limit: '80mb' }));
app.use(express.urlencoded({ extended: true, limit: '80mb' }));

import { decryptPath } from './lib/crypto';
import { authenticateSession, requireSuperAdmin } from './middlewares/auth';

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// UNBLOCKABLE ASSET PROXY (Fixes cPanel CORS issues)
app.get('/api/assets/*', (req: Request, res: Response) => {
  let assetPath = (req.params as any)[0] || '';
  
  if (assetPath.startsWith('ENC-')) {
    assetPath = decryptPath(assetPath);
  }
  
  // Strip leading slash to prevent joining issues
  const cleanAssetPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
  const fullPath = path.join(process.cwd(), 'public', cleanAssetPath);
  
  if (fs.existsSync(fullPath)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.sendFile(fullPath);
  }
  res.status(404).send('Asset not found');
});

// Routes
import candidateRoutes from './routes/candidates';
import brokerRoutes from './routes/brokers';
import leaderRoutes from './routes/leaders';
import userRoutes from './routes/users';
import cvRoutes from './routes/cv';
import generatedCvRoutes from './routes/generated-cvs';
import fileRoutes from './routes/files';
import deploymentRoutes from './routes/deployments';
import ocrRoutes from './routes/ocr';
import extractRoutes from './routes/extract';
import notificationRoutes from './routes/notifications';
import accountRoutes from './routes/account';
import searchRoutes from './routes/search';
import cronRoutes from './routes/cron';
import quickRegistrationRoutes from './routes/quick-registrations';
import invoiceRoutes from './routes/invoices';
import settingsRoutes from './routes/settings';
import agencyRoutes from './routes/agency';
import passportRoutes from './routes/passports';

app.use('/api/candidates', authenticateSession, candidateRoutes);
app.use('/api/brokers', authenticateSession, brokerRoutes);
app.use('/api/leaders', authenticateSession, leaderRoutes);
app.use('/api/users', userRoutes); // users route mounts authenticateSession internally
app.use('/api/cv', authenticateSession, cvRoutes);
app.use('/api/generated-cvs', authenticateSession, generatedCvRoutes);
app.use('/api/ocr', authenticateSession, ocrRoutes);
app.use('/api/extract', authenticateSession, extractRoutes);
app.use('/api/notifications', authenticateSession, notificationRoutes);
app.use('/api/account', authenticateSession, accountRoutes);
app.use('/api/search', authenticateSession, searchRoutes);
app.use('/api/cron', cronRoutes); // cron left unauthenticated for external cron-job triggers (or secure via secret key)
app.use('/api/quick-registrations', authenticateSession, quickRegistrationRoutes);
app.use('/api/invoices', authenticateSession, invoiceRoutes);
app.use('/api/settings', authenticateSession, settingsRoutes);
app.use('/api/files', authenticateSession, fileRoutes);
app.use('/api/deployments', authenticateSession, deploymentRoutes);
app.use('/api/agency', authenticateSession, agencyRoutes);
app.use('/api/passports', authenticateSession, passportRoutes);


// Database Debug Endpoint (Direct Browser Diagnostics)
app.get('/api/debug-db', authenticateSession, requireSuperAdmin, async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const envInfo = {
    HOME: process.env.HOME,
    USER: process.env.USER,
    PWD: process.env.PWD,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL_RAW: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.split('@')[1] || process.env.DATABASE_URL}` : 'not set',
  };

  const isCPanel = 
    process.env.HOME?.includes('coolstou') || 
    process.env.USER === 'coolstou' || 
    process.env.PWD?.includes('coolstou') ||
    process.env.BETTER_AUTH_URL?.includes('coolstaffagency.com');

  let dbUrlSelected = process.env.DATABASE_URL || '';
  if (isCPanel) {
    dbUrlSelected = 'mysql://coolstou_coolstaff:***@127.0.0.1:3306/coolstou_db';
  } else {
    dbUrlSelected = dbUrlSelected ? `${dbUrlSelected.split('@')[1] || dbUrlSelected}` : 'none';
  }

  const diagnostics: any = {
    status: 'checking',
    isCPanelDetected: !!isCPanel,
    dbUrlSelected: dbUrlSelected.replace(/:[^@:]*@/, ':***@'), // extra mask safety
    environment: {
      ...envInfo,
      DATABASE_URL_RAW: envInfo.DATABASE_URL_RAW.replace(/:[^@:]*@/, ':***@'),
    },
  };

  try {
    // Attempt database query with a 3-second timeout so it doesn't hang
    const dbPromise = (async () => {
      const rawResult = await db.execute(sql`SELECT 1 + 1 AS result`);
      
      const userCountResult = await db.select({ count: sql<number>`count(*)` }).from(user);
      const userCount = Number(userCountResult[0]?.count || 0);

      const candidateCountResult = await db.select({ count: sql<number>`count(*)` }).from(candidate);
      const candidateCount = Number(candidateCountResult[0]?.count || 0);
      
      // Diagnose tables and columns
      let tables: any[] = [];
      try {
        tables = (await db.execute(sql`SHOW TABLES`))[0] as unknown as any[];
      } catch (e: any) {
        tables = [{ error: e.message }];
      }

      let leaderColumns: any[] = [];
      try {
        leaderColumns = (await db.execute(sql`SHOW COLUMNS FROM Leader`))[0] as unknown as any[];
      } catch (e: any) {
        leaderColumns = [{ error: e.message }];
      }

      let brokerColumns: any[] = [];
      try {
        brokerColumns = (await db.execute(sql`SHOW COLUMNS FROM Broker`))[0] as unknown as any[];
      } catch (e: any) {
        brokerColumns = [{ error: e.message }];
      }

      // Check client models
      const clientModels = ['leader', 'broker', 'candidate', 'user', 'session', 'account', 'verification'];

      return { 
        rawResult, 
        userCount, 
        candidateCount,
        clientModels,
        hasLeaderModel: true,
        hasBrokerModel: true,
        tables,
        leaderColumns,
        brokerColumns
      };
    })();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timed out (3000ms exceeded). Check if server firewall blocks port.')), 3000)
    );

    const result: any = await Promise.race([dbPromise, timeoutPromise]);
    
    diagnostics.status = 'success';
    diagnostics.message = 'Database is CONNECTED and responding!';
    diagnostics.queryResult = result;
  } catch (error: any) {
    diagnostics.status = 'error';
    diagnostics.message = 'Database diagnostic failed!';
    diagnostics.error = error.message || String(error);
  }

  // Scan typical MySQL sockets on cPanel to help diagnose connections
  const socketPaths = [
    '/var/lib/mysql/mysql.sock',
    '/var/run/mysqld/mysqld.sock',
    '/tmp/mysql.sock',
    '/tmp/mysql.sock.lock',
    '/var/run/mysql/mysql.sock',
  ];
  const socketCheck: Record<string, boolean> = {};
  socketPaths.forEach(p => {
    try {
      socketCheck[p] = fs.existsSync(p);
    } catch {
      socketCheck[p] = false;
    }
  });
  diagnostics.socketCheck = socketCheck;

  // Run low-level network connectivity tests using built-in 'net' module
  const net = await import('net');
  const checkPort = (host: string, port: number): Promise<any> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);
      socket.connect(port, host, () => {
        socket.destroy();
        resolve({ open: true });
      });
      socket.on('error', (e) => {
        socket.destroy();
        resolve({ open: false, error: e.message });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ open: false, error: 'Timeout' });
      });
    });
  };

  const checkUnix = (path: string): Promise<any> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);
      socket.connect(path, () => {
        socket.destroy();
        resolve({ open: true });
      });
      socket.on('error', (e) => {
        socket.destroy();
        resolve({ open: false, error: e.message });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ open: false, error: 'Timeout' });
      });
    });
  };

  try {
    diagnostics.netConnectTest = {
      localhost_3306: await checkPort('localhost', 3306),
      ip_127_0_0_1_3306: await checkPort('127.0.0.1', 3306),
      unix_socket_var_lib: await checkUnix('/var/lib/mysql/mysql.sock'),
      unix_socket_tmp: await checkUnix('/tmp/mysql.sock'),
    };
  } catch (netErr: any) {
    diagnostics.netConnectTestError = netErr.message || String(netErr);
  }

  res.json(diagnostics);
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'SKY Agency API is running' });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('SERVER ERROR:', err);
  
  // Ensure CORS headers are present even on error
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message || 'Unknown error',
    code: err.code 
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
  
  // 1. Run database self-healing checks to inject missing tables/columns
  try {
    await ensureDatabaseSchema();
  } catch (dbErr) {
    console.error('❌ Failed to run database self-healing check on startup:', dbErr);
  }
});
