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
import { createId } from '@paralleldrive/cuid2';

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
  videoUrl: varchar('Youtube_URL', { length: 191 }),
  quickVideoUrl: longtext('quickVideoUrl'),
  registeredAt: timestamp('registeredAt', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  status: varchar('status', { length: 191 }).notNull().default('pending'),
  visaSelected: boolean('visaSelected').notNull().default(false),
  visaDate: datetime('visaDate', { fsp: 3 }),
  salary: varchar('salary', { length: 191 }).default('1000SR'),
  agency: varchar('agency', { length: 191 }).default('daera'),
  deployedDate: datetime('deployedDate', { fsp: 3 }),
  isLocked: boolean('isLocked').notNull().default(false),
  cvDownloaded: boolean('cvDownloaded').notNull().default(false),
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
// 6. USER TABLE
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
// 7. SESSION TABLE
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
// 8. ACCOUNT TABLE
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
// 9. VERIFICATION TABLE
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
  agency: varchar('agency', { length: 191 }).default('daera'),
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
// 14. TEMPLATEPRICE TABLE
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
