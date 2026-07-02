# Migration Plan: Prisma ORM to Drizzle ORM

This document outlines the comprehensive plan for migrating the COOLSTAFF backend database access layer from Prisma ORM to Drizzle ORM. 

## 1. Executive Summary & Current Database Status

*   **Current Database Engine:** **MySQL** (utilized locally, via Aiven Cloud in staging, and through a local TCP/Socket connection on cPanel in production).
*   **Target ORM:** **Drizzle ORM** (paired with the `mysql2` driver).
*   **File Upload Architecture:** File uploads are managed via `server/src/lib/upload.ts` using base64-to-buffer conversion. Depending on `STORAGE_MODE` (`local` or `cloudinary`), uploaded file paths are saved to the database as relative local paths (e.g. `/uploads/videos/...`) or full Cloudinary URLs. The upload layer is decoupled from the ORM and does not require modifications, though the database columns storing these paths must be correctly defined.
*   **Authentication Layer:** Powered by `better-auth`, which currently utilizes `@better-auth/prisma-adapter`. This must be updated to `@better-auth/drizzle-adapter`.
*   **Self-Healing Database Pattern:** On startup, the Express server executes `ensureDatabaseSchema()` inside `server/src/lib/db-healing.ts` using raw SQL statements to auto-create tables, append columns, and run backfill scripts. This ensures compatibility across different environments (Vercel, cPanel, etc.). Drizzle's direct database execution helper `db.execute()` will be mapped to replace the current `prisma.$executeRawUnsafe()`.

---

## 2. Key Migration Benefits for COOLSTAFF

1.  **Elimination of Stale Client Issues:** The server currently relies on raw SQL queries in several locations (e.g., `TemplatePrice` table queries, analytics counts, and video associations) to bypass stale or out-of-sync Prisma Client generator builds on VPS environments. Drizzle is a lightweight, runtime-only TypeScript ORM that does not rely on a generated client block, removing this build step entirely.
2.  **Explicit Ad-hoc Schemas:** Tables created dynamically via raw SQL (such as `TemplatePrice`) can now be defined explicitly as Drizzle tables alongside the main schema, bringing full type safety to settings and invoice endpoints.
3.  **Performance:** Drizzle executes queries with near-zero overhead compared to Prisma's engine binary, resulting in lower startup times and resource usage.

---

## 3. Detailed Drizzle Schema Definitions (`schema.ts`)

Create a new file `server/src/db/schema.ts` to host all table schemas, indexes, foreign keys, and relations using the Drizzle MySQL driver core.

```typescript
import { 
  mysqlTable, 
  varchar, 
  boolean, 
  timestamp, 
  index, 
  uniqueIndex, 
  text, 
  int, 
  json, 
  datetime, 
  longtext 
} from 'drizzle-orm/mysql-core';
import { sql, relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2'; // Replaces cuid() generator

// ==========================================
// 1. LEADER TABLE
// ==========================================
export const leader = mysqlTable('Leader', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 191 }).notNull().unique(),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  nameIdx: uniqueIndex('Leader_name_key').on(table.name),
}));

// ==========================================
// 2. BROKER TABLE
// ==========================================
export const broker = mysqlTable('Broker', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 191 }).notNull().unique(),
  isLocked: boolean('isLocked').notNull().default(false),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  leaderId: varchar('leaderId', { length: 191 }),
}, (table) => ({
  nameIdx: uniqueIndex('Broker_name_key').on(table.name),
  leaderIdIdx: index('Broker_leaderId_idx').on(table.leaderId),
}));

// ==========================================
// 3. CANDIDATE TABLE
// ==========================================
export const candidate = mysqlTable('Candidate', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  shelfId: varchar('shelfId', { length: 191 }),
  passportNumber: varchar('passportNumber', { length: 191 }).notNull().unique(),
  surname: varchar('surname', { length: 191 }).notNull(),
  givenNames: varchar('givenNames', { length: 191 }).notNull(),
  dateOfBirth: datetime('dateOfBirth', { fsp: 3 }).notNull(),
  gender: varchar('gender', { length: 191 }).notNull(),
  nationality: varchar('nationality', { length: 191 }).notNull(),
  issuingCountry: varchar('issuingCountry', { length: 191 }).notNull(),
  dateOfIssue: datetime('dateOfIssue', { fsp: 3 }).notNull(),
  dateOfExpiry: datetime('dateOfExpiry', { fsp: 3 }).notNull(),
  placeOfBirth: varchar('placeOfBirth', { length: 191 }).notNull(),
  maritalStatus: varchar('maritalStatus', { length: 191 }).notNull(),
  numberOfChildren: int('numberOfChildren').notNull().default(0),
  religion: varchar('religion', { length: 191 }).notNull(),
  bloodType: varchar('bloodType', { length: 191 }).notNull(),
  height: varchar('height', { length: 191 }),
  weight: varchar('weight', { length: 191 }),
  phone: varchar('phone', { length: 191 }),
  additionalPhones: json('additionalPhones'),
  email: varchar('email', { length: 191 }),
  address: varchar('address', { length: 191 }),
  city: varchar('city', { length: 191 }),
  state: varchar('state', { length: 191 }),
  country: varchar('country', { length: 191 }),
  idNumber: varchar('idNumber', { length: 191 }),
  job: varchar('job', { length: 191 }),
  educationLevel: varchar('educationLevel', { length: 191 }),
  languages: json('languages'),
  workExperience: json('workExperience'),
  skills: json('skills'),
  medicalStatus: varchar('medicalStatus', { length: 191 }).notNull().default('Pending'),
  biometricStatus: varchar('biometricStatus', { length: 191 }).notNull().default('Pending'),
  medicalDate: datetime('medicalDate', { fsp: 3 }),
  biometricDate: datetime('biometricDate', { fsp: 3 }),
  knownConditions: varchar('knownConditions', { length: 191 }),
  cvDeadline: datetime('cvDeadline', { fsp: 3 }),
  emergencyContactName: varchar('emergencyContactName', { length: 191 }),
  emergencyContactRelation: varchar('emergencyContactRelation', { length: 191 }),
  emergencyContactPhone: varchar('emergencyContactPhone', { length: 191 }),
  emergencyContactAddress: varchar('emergencyContactAddress', { length: 191 }),
  passportImageUrl: varchar('passportImageUrl', { length: 191 }),
  facePhotoUrl: varchar('facePhotoUrl', { length: 191 }),
  fullBodyPhotoUrl: varchar('fullBodyPhotoUrl', { length: 191 }),
  cocDocumentUrl: text('cocDocumentUrl'),
  medicalDocumentUrl: varchar('medicalDocumentUrl', { length: 191 }),
  candidateIdImageUrl: text('candidateIdImageUrl'),
  relativeIdImageUrl: text('relativeIdImageUrl'),
  labourIdUrl: text('labourIdUrl'),
  isRequested: boolean('isRequested').notNull().default(false),
  visaOrContractNumber: varchar('visaOrContractNumber', { length: 191 }),
  isFlagged: boolean('isFlagged').notNull().default(false),
  videoUrl: varchar('Youtube_URL', { length: 191 }), // Maps to Youtube_URL in existing schema
  quickVideoUrl: longtext('quickVideoUrl'),
  registeredAt: timestamp('registeredAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  status: varchar('status', { length: 191 }).notNull().default('pending'),
  visaSelected: boolean('visaSelected').notNull().default(false),
  visaDate: datetime('visaDate', { fsp: 3 }),
  salary: varchar('salary', { length: 191 }).default('1000SR'),
  agency: varchar('agency', { length: 191 }).default('Sky'),
  deployedDate: datetime('deployedDate', { fsp: 3 }),
  isLocked: boolean('isLocked').notNull().default(false),
  allowVideo: boolean('allowVideo').notNull().default(false),
  embassyIssue: varchar('embassyIssue', { length: 191 }).notNull().default('No'),
  cocStatus: varchar('cocStatus', { length: 191 }).notNull().default('No'),
  tasheerStatus: varchar('tasheerStatus', { length: 191 }).notNull().default('No'),
  wakalaStatus: varchar('wakalaStatus', { length: 191 }).notNull().default('Unpaid'),
  qrCodeStatus: varchar('qrCodeStatus', { length: 191 }).notNull().default('No'),
  selectedType: varchar('selectedType', { length: 191 }).notNull().default('Private'),
  price: varchar('price', { length: 191 }),
  travelDate: datetime('travelDate', { fsp: 3 }),
  agencyStatus: varchar('agencyStatus', { length: 191 }).notNull().default('Under Process'),
  agencySelected: boolean('agencySelected').notNull().default(false),
  brokerId: varchar('brokerId', { length: 191 }),
  registeredById: varchar('registeredById', { length: 191 }),
}, (table) => ({
  passportNumberIdx: uniqueIndex('Candidate_passportNumber_key').on(table.passportNumber),
  passportNumberNormalIdx: index('Candidate_passportNumber_idx').on(table.passportNumber),
  nationalityIdx: index('Candidate_nationality_idx').on(table.nationality),
  brokerIdIdx: index('Candidate_brokerId_idx').on(table.brokerId),
  registeredByIdIdx: index('Candidate_registeredById_idx').on(table.registeredById),
}));

// ==========================================
// 4. GENERATEDCV TABLE
// ==========================================
export const generatedCV = mysqlTable('GeneratedCV', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  candidateId: varchar('candidateId', { length: 191 }).notNull(),
  templateId: varchar('templateId', { length: 191 }).notNull(),
  facePhotoUrl: text('facePhotoUrl'),
  fullBodyPhotoUrl: text('fullBodyPhotoUrl'),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp('updatedAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  candidateIdIdx: index('GeneratedCV_candidateId_idx').on(table.candidateId),
  templateIdIdx: index('GeneratedCV_templateId_idx').on(table.templateId),
}));

// ==========================================
// 5. NOTIFICATION TABLE
// ==========================================
export const notification = mysqlTable('Notification', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  title: varchar('title', { length: 191 }).notNull(),
  message: varchar('message', { length: 191 }).notNull(),
  isRead: boolean('isRead').notNull().default(false),
  candidateId: varchar('candidateId', { length: 191 }),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  createdAtIdx: index('Notification_createdAt_idx').on(table.createdAt),
  isReadIdx: index('Notification_isRead_idx').on(table.isRead),
}));

// ==========================================
// 6. USER TABLE (Better Auth)
// ==========================================
export const user = mysqlTable('User', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 191 }).notNull(),
  email: varchar('email', { length: 191 }).notNull(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: varchar('image', { length: 191 }),
  role: varchar('role', { length: 191 }).notNull().default('user'),
  agency: varchar('agency', { length: 191 }),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp('updatedAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  emailIdx: index('User_email_idx').on(table.email),
  roleIdx: index('User_role_idx').on(table.role),
  emailUniqueIdx: uniqueIndex('User_email_key').on(table.email),
}));

// ==========================================
// 7. SESSION TABLE (Better Auth)
// ==========================================
export const session = mysqlTable('Session', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  expiresAt: datetime('expiresAt', { fsp: 3 }).notNull(),
  token: varchar('token', { length: 191 }).notNull().unique(),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp('updatedAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  ipAddress: varchar('ipAddress', { length: 191 }),
  userAgent: text('userAgent'),
  userId: varchar('userId', { length: 191 }).notNull(),
}, (table) => ({
  tokenIdx: index('Session_token_idx').on(table.token),
  userIdIdx: index('Session_userId_idx').on(table.userId),
  tokenUniqueIdx: uniqueIndex('Session_token_key').on(table.token),
}));

// ==========================================
// 8. ACCOUNT TABLE (Better Auth)
// ==========================================
export const account = mysqlTable('Account', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  accountId: varchar('accountId', { length: 191 }).notNull(),
  providerId: varchar('providerId', { length: 191 }).notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: datetime('accessTokenExpiresAt', { fsp: 3 }),
  refreshTokenExpiresAt: datetime('refreshTokenExpiresAt', { fsp: 3 }),
  scope: varchar('scope', { length: 191 }),
  password: varchar('password', { length: 191 }),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp('updatedAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  userId: varchar('userId', { length: 191 }).notNull(),
}, (table) => ({
  userIdIdx: index('Account_userId_idx').on(table.userId),
  providerIdAccountIdIdx: index('Account_providerId_accountId_idx').on(table.providerId, table.accountId),
}));

// ==========================================
// 9. VERIFICATION TABLE (Better Auth)
// ==========================================
export const verification = mysqlTable('Verification', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  identifier: varchar('identifier', { length: 191 }).notNull(),
  value: varchar('value', { length: 191 }).notNull(),
  expiresAt: datetime('expiresAt', { fsp: 3 }).notNull(),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp('updatedAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  identifierIdx: index('Verification_identifier_idx').on(table.identifier),
}));

// ==========================================
// 10. QUICKREGISTRATION TABLE
// ==========================================
export const quickRegistration = mysqlTable('QuickRegistration', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  passportNumber: varchar('passportNumber', { length: 191 }).notNull(),
  passportType: varchar('passportType', { length: 191 }).default('original'),
  surname: varchar('surname', { length: 191 }).notNull(),
  givenNames: varchar('givenNames', { length: 191 }).notNull(),
  dateOfBirth: varchar('dateOfBirth', { length: 191 }),
  gender: varchar('gender', { length: 191 }),
  nationality: varchar('nationality', { length: 191 }),
  dateOfExpiry: varchar('dateOfExpiry', { length: 191 }),
  issuingCountry: varchar('issuingCountry', { length: 191 }),
  placeOfBirth: varchar('placeOfBirth', { length: 191 }),
  educationLevel: varchar('educationLevel', { length: 191 }),
  jobExperience: longtext('jobExperience'),
  maritalStatus: varchar('maritalStatus', { length: 191 }),
  numberOfChildren: int('numberOfChildren').notNull().default(0),
  passportImageUrl: longtext('passportImageUrl'),
  religion: varchar('religion', { length: 191 }),
  relativePhones: json('relativePhones'),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  verificationStatus: varchar('verificationStatus', { length: 191 }).notNull().default('pending'),
  musanedCvUrl: longtext('musanedCvUrl'),
  verificationNotes: varchar('verificationNotes', { length: 191 }),
  verifiedAt: datetime('verifiedAt', { fsp: 3 }),
  promotedAt: datetime('promotedAt', { fsp: 3 }),
  promotedCandidateId: varchar('promotedCandidateId', { length: 191 }),
  cocDocumentUrl: longtext('cocDocumentUrl'),
  labourIdUrl: longtext('labourIdUrl'),
  candidateIdImageUrl: longtext('candidateIdImageUrl'),
  relativeIdImageUrl: longtext('relativeIdImageUrl'),
  agency: varchar('agency', { length: 191 }).default('Sky'),
  videoUrl: varchar('videoUrl', { length: 500 }),
  languages: json('languages'),
  allowVideo: boolean('allowVideo').notNull().default(false),
  brokerId: varchar('brokerId', { length: 191 }),
  registeredById: varchar('registeredById', { length: 191 }),
}, (table) => ({
  createdAtIdx: index('QuickRegistration_createdAt_idx').on(table.createdAt),
  brokerIdIdx: index('QuickRegistration_brokerId_idx').on(table.brokerId),
  registeredByIdIdx: index('QuickRegistration_registeredById_idx').on(table.registeredById),
}));

// ==========================================
// 11. INVOICE TABLE
// ==========================================
export const invoice = mysqlTable('Invoice', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  candidateId: varchar('candidateId', { length: 191 }).notNull(),
  lmisQrCodeUrl: text('lmisQrCodeUrl').notNull(),
  insuranceUrl: text('insuranceUrl').notNull(),
  ticketUrl: text('ticketUrl').notNull(),
  price: varchar('price', { length: 191 }).notNull(),
  isDelivered: boolean('isDelivered').notNull().default(false),
  deployedDate: datetime('deployedDate', { fsp: 3 }),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp('updatedAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  candidateIdIdx: index('Invoice_candidateId_idx').on(table.candidateId),
}));

// ==========================================
// 12. PREREGISTEREDVIDEO TABLE
// ==========================================
export const preRegisteredVideo = mysqlTable('PreRegisteredVideo', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  passportNumber: varchar('passportNumber', { length: 191 }).notNull().unique(),
  videoUrl: text('videoUrl').notNull(),
  facePhotoUrl: text('facePhotoUrl'),
  fullBodyPhotoUrl: text('fullBodyPhotoUrl'),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  passportNumberUniqueIdx: uniqueIndex('PreRegisteredVideo_passportNumber_key').on(table.passportNumber),
}));

// ==========================================
// 13. PASSPORT TABLE
// ==========================================
export const passport = mysqlTable('Passport', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  shelfNo: varchar('shelfNo', { length: 191 }).notNull(),
  fullName: varchar('fullName', { length: 191 }).notNull(),
  passportNumber: varchar('passportNumber', { length: 191 }).notNull().unique(),
  passportImageUrl: longtext('passportImageUrl'),
  status: varchar('status', { length: 191 }).notNull().default('Available'),
  takenReason: varchar('takenReason', { length: 191 }),
  takenByName: varchar('takenByName', { length: 191 }),
  takenByPhone: varchar('takenByPhone', { length: 191 }),
  createdAt: timestamp('createdAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp('updatedAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  passportNumberUniqueIdx: uniqueIndex('Passport_passportNumber_key').on(table.passportNumber),
  passportNumberIdx: index('Passport_passportNumber_idx').on(table.passportNumber),
  statusIdx: index('Passport_status_idx').on(table.status),
}));

// ==========================================
// 14. TEMPLATEPRICE TABLE (Explicitly Mapped)
// ==========================================
export const templatePrice = mysqlTable('TemplatePrice', {
  templateId: varchar('templateId', { length: 191 }).primaryKey(),
  price: varchar('price', { length: 191 }).notNull(),
  updatedAt: timestamp('updatedAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
});

// ==============================================================================
// DRIZZLE RELATIONS DEFINITIONS (For nested selection equivalent to Prisma includes)
// ==============================================================================

export const leaderRelations = relations(leader, ({ many }) => ({
  brokers: many(broker),
}));

export const brokerRelations = relations(broker, ({ one, many }) => ({
  leader: one(leader, {
    fields: [broker.leaderId],
    references: [leader.id],
  }),
  candidates: many(candidate),
  quickRegistrations: many(quickRegistration),
}));

export const candidateRelations = relations(candidate, ({ one, many }) => ({
  broker: one(broker, {
    fields: [candidate.brokerId],
    references: [broker.id],
  }),
  registeredBy: one(user, {
    fields: [candidate.registeredById],
    references: [user.id],
  }),
  generatedCVs: many(generatedCV),
  invoices: many(invoice),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  candidates: many(candidate),
  quickRegistrations: many(quickRegistration),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const generatedCVRelations = relations(generatedCV, ({ one }) => ({
  candidate: one(candidate, {
    fields: [generatedCV.candidateId],
    references: [candidate.id],
  }),
}));

export const quickRegistrationRelations = relations(quickRegistration, ({ one }) => ({
  broker: one(broker, {
    fields: [quickRegistration.brokerId],
    references: [broker.id],
  }),
  registeredBy: one(user, {
    fields: [quickRegistration.registeredById],
    references: [user.id],
  }),
}));

export const invoiceRelations = relations(invoice, ({ one }) => ({
  candidate: one(candidate, {
    fields: [invoice.candidateId],
    references: [candidate.id],
  }),
}));
```

---

## 4. Drizzle Configuration File (`drizzle.config.ts`)

Create a standard Drizzle configuration file in `server/drizzle.config.ts` to allow database mirroring and introspection.

```typescript
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
```

---

## 5. Drizzle Client Instantiation (`db.ts`)

Create the Drizzle connection client in `server/src/db/index.ts`. This replaces `prisma.ts` and retains the cPanel environment auto-detection fail-safe to swap endpoints during local/production context execution.

```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

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
```

---

## 6. Authentication Migration (Better Auth Config)

We will modify `server/src/lib/auth.ts` to switch the database adapter from Prisma to Drizzle.

### Before:
```typescript
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'mysql',
  }),
  ...
});
```

### After:
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'mysql',
    schema: schema,
  }),
  ...
});
```

---

## 7. Migration of Self-Healing Schema Logic (`db-healing.ts`)

Currently, `ensureDatabaseSchema` uses `prisma.$executeRawUnsafe` to inspect/update the schema. In the migrated version, we'll import `db` from `../db` and utilize standard query executions.

### Migration Syntax:
- Replace `await prisma.$executeRawUnsafe("...")` with `await db.execute(sql`...`)`
- Replace `await prisma.quickRegistration.findFirst(...)` with Drizzle's relational queries: `await db.query.quickRegistration.findFirst(...)`

```typescript
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { quickRegistration } from '../db/schema';

export async function ensureDatabaseSchema() {
  console.log('🔧 Starting database self-healing schema checks...');

  // Create User table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`User\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL,
        \`emailVerified\` TINYINT(1) NOT NULL DEFAULT 0,
        \`image\` VARCHAR(191) NULL,
        \`role\` VARCHAR(191) NOT NULL DEFAULT 'user',
        \`agency\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`User_email_key\` (\`email\`),
        INDEX \`User_email_idx\` (\`email\`),
        INDEX \`User_role_idx\` (\`role\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'User' table.`);
  } catch (e: any) {
    console.warn('⚠️ User table check warning:', e.message || e);
  }
  
  // (Perform other alterations and indices validations similarly using db.execute)
}
```

---

## 8. Query Refactoring Patterns Reference

To assist developers, here is a mapping of common query conventions from Prisma to Drizzle within the route endpoints:

### A. Fetching Records with Relations (Includes)

**Prisma:**
```typescript
const sessions = await prisma.session.findMany({ 
  include: { user: { select: { id: true, email: true, role: true } } }, 
  take: 5 
});
```

**Drizzle (using Relational Query Builder):**
```typescript
const sessions = await db.query.session.findMany({
  with: {
    user: {
      columns: {
        id: true,
        email: true,
        role: true,
      }
    }
  },
  limit: 5,
});
```

### B. Creating a Record

**Prisma:**
```typescript
await prisma.notification.create({
  data: {
    title: 'Alert',
    message: 'Hello',
    candidateId: candidate.id
  }
});
```

**Drizzle:**
```typescript
import { notification } from '../db/schema';

await db.insert(notification).values({
  title: 'Alert',
  message: 'Hello',
  candidateId: candidate.id
});
```

### C. Updating a Record

**Prisma:**
```typescript
await prisma.candidate.update({
  where: { id },
  data: { videoUrl: finalVideoUrl },
});
```

**Drizzle:**
```typescript
import { candidate } from '../db/schema';
import { eq } from 'drizzle-orm';

await db.update(candidate)
  .set({ videoUrl: finalVideoUrl })
  .where(eq(candidate.id, id));
```

### D. Group By / Aggregation

**Prisma:**
```typescript
const counts = await prisma.candidate.groupBy({
  by: ['registeredById'],
  _count: { id: true },
});
```

**Drizzle:**
```typescript
import { candidate } from '../db/schema';
import { sql } from 'drizzle-orm';

const counts = await db.select({
  registeredById: candidate.registeredById,
  count: sql<number>`count(${candidate.id})`
})
.from(candidate)
.groupBy(candidate.registeredById);
```

---

## 9. Phase-by-Phase Implementation Plan

### Phase 1: Preparation (Dependency setup)
1. Add `mysql2` and `drizzle-orm` dependencies. Add `drizzle-kit` and `@types/node` as devDependencies (these are already mostly in place).
2. Install `@better-auth/drizzle-adapter` and `@paralleldrive/cuid2` for the ID generators.

### Phase 2: Schema Creation & Authentication Swap
1. Write the `server/src/db/schema.ts` file containing all the schemas.
2. Initialize client configuration in `server/src/db/index.ts`.
3. Update `server/src/lib/auth.ts` to bind better-auth to Drizzle.

### Phase 3: DB Self-Healing Refactor
1. Convert `server/src/lib/db-healing.ts` queries from Prisma raw checks to Drizzle schema operations.

### Phase 4: API Refactoring (Progressive)
1. Update each route file one by one under `server/src/routes/` to import `db` instead of `prisma` and rewrite core queries.
2. Update global and independent scripts like `create-admin.ts` and `print-users.ts`.

### Phase 5: Verification and Clean-up
1. Run local integration tests on server starts to check table initialization.
2. Remove `@prisma/client`, `prisma`, and all `.prisma` schema directories when everything is verified.
