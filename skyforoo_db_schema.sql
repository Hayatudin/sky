-- ============================================================
-- SKY Foreign Employment Agency — Full Database Schema
-- Database : skyforoo_db
-- Run this entire script in phpMyAdmin → SQL tab
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;   -- disable FK checks while creating tables
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- ────────────────────────────────────────────────────────────
-- 1. USER
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `User` (
  `id`            VARCHAR(191)  NOT NULL,
  `name`          VARCHAR(191)  NOT NULL,
  `email`         VARCHAR(191)  NOT NULL,
  `emailVerified` TINYINT(1)   NOT NULL DEFAULT 0,
  `image`         VARCHAR(191)  NULL,
  `role`          VARCHAR(191)  NOT NULL DEFAULT 'user',
  `agency`        VARCHAR(191)  NULL,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  INDEX `User_email_idx` (`email`),
  INDEX `User_role_idx`  (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 2. SESSION  (Better Auth)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Session` (
  `id`         VARCHAR(191) NOT NULL,
  `expiresAt`  DATETIME(3)  NOT NULL,
  `token`      VARCHAR(191) NOT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `ipAddress`  VARCHAR(191) NULL,
  `userAgent`  TEXT         NULL,
  `userId`     VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Session_token_key`  (`token`),
  INDEX        `Session_token_idx`  (`token`),
  INDEX        `Session_userId_idx` (`userId`),
  CONSTRAINT `Session_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 3. ACCOUNT  (Better Auth)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Account` (
  `id`                     VARCHAR(191) NOT NULL,
  `accountId`              VARCHAR(191) NOT NULL,
  `providerId`             VARCHAR(191) NOT NULL,
  `accessToken`            TEXT         NULL,
  `refreshToken`           TEXT         NULL,
  `idToken`                TEXT         NULL,
  `accessTokenExpiresAt`   DATETIME(3)  NULL,
  `refreshTokenExpiresAt`  DATETIME(3)  NULL,
  `scope`                  VARCHAR(191) NULL,
  `password`               VARCHAR(191) NULL,
  `createdAt`              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `userId`                 VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Account_userId_idx`               (`userId`),
  INDEX `Account_providerId_accountId_idx` (`providerId`, `accountId`),
  CONSTRAINT `Account_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 4. VERIFICATION  (Better Auth)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Verification` (
  `id`         VARCHAR(191) NOT NULL,
  `identifier` VARCHAR(191) NOT NULL,
  `value`      VARCHAR(191) NOT NULL,
  `expiresAt`  DATETIME(3)  NOT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Verification_identifier_idx` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 5. LEADER
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Leader` (
  `id`        VARCHAR(191) NOT NULL,
  `name`      VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Leader_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 6. BROKER
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Broker` (
  `id`        VARCHAR(191) NOT NULL,
  `name`      VARCHAR(191) NOT NULL,
  `isLocked`  TINYINT(1)   NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `leaderId`  VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Broker_name_key`     (`name`),
  INDEX       `Broker_leaderId_idx` (`leaderId`),
  CONSTRAINT `Broker_leaderId_fkey`
    FOREIGN KEY (`leaderId`) REFERENCES `Leader`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 7. CANDIDATE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Candidate` (
  `id`                     VARCHAR(191)  NOT NULL,
  `shelfId`                VARCHAR(191)  NULL,
  `passportNumber`         VARCHAR(191)  NOT NULL,
  `surname`                VARCHAR(191)  NOT NULL,
  `givenNames`             VARCHAR(191)  NOT NULL,
  `dateOfBirth`            DATETIME(3)   NOT NULL,
  `gender`                 VARCHAR(191)  NOT NULL,
  `nationality`            VARCHAR(191)  NOT NULL,
  `issuingCountry`         VARCHAR(191)  NOT NULL,
  `dateOfIssue`            DATETIME(3)   NOT NULL,
  `dateOfExpiry`           DATETIME(3)   NOT NULL,
  `placeOfBirth`           VARCHAR(191)  NOT NULL,
  `maritalStatus`          VARCHAR(191)  NOT NULL,
  `numberOfChildren`       INT           NOT NULL DEFAULT 0,
  `religion`               VARCHAR(191)  NOT NULL,
  `bloodType`              VARCHAR(191)  NOT NULL,
  `height`                 VARCHAR(191)  NULL,
  `weight`                 VARCHAR(191)  NULL,
  `phone`                  VARCHAR(191)  NULL,
  `additionalPhones`       JSON          NULL,
  `email`                  VARCHAR(191)  NULL,
  `address`                VARCHAR(191)  NULL,
  `city`                   VARCHAR(191)  NULL,
  `state`                  VARCHAR(191)  NULL,
  `country`                VARCHAR(191)  NULL,
  `idNumber`               VARCHAR(191)  NULL,
  `job`                    VARCHAR(191)  NULL,
  `educationLevel`         VARCHAR(191)  NULL,
  `languages`              JSON          NULL,
  `workExperience`         JSON          NULL,
  `skills`                 JSON          NULL,
  `medicalStatus`          VARCHAR(191)  NOT NULL DEFAULT 'Pending',
  `biometricStatus`        VARCHAR(191)  NOT NULL DEFAULT 'Pending',
  `medicalDate`            DATETIME(3)   NULL,
  `biometricDate`          DATETIME(3)   NULL,
  `knownConditions`        VARCHAR(191)  NULL,
  `cvDeadline`             DATETIME(3)   NULL,
  `emergencyContactName`   VARCHAR(191)  NULL,
  `emergencyContactRelation` VARCHAR(191) NULL,
  `emergencyContactPhone`  VARCHAR(191)  NULL,
  `emergencyContactAddress` VARCHAR(191) NULL,
  `passportImageUrl`       VARCHAR(191)  NULL,
  `facePhotoUrl`           VARCHAR(191)  NULL,
  `fullBodyPhotoUrl`       VARCHAR(191)  NULL,
  `cocDocumentUrl`         LONGTEXT      NULL,
  `medicalDocumentUrl`     VARCHAR(191)  NULL,
  `candidateIdImageUrl`    LONGTEXT      NULL,
  `relativeIdImageUrl`     LONGTEXT      NULL,
  `labourIdUrl`            LONGTEXT      NULL,
  `isRequested`            TINYINT(1)    NOT NULL DEFAULT 0,
  `visaOrContractNumber`   VARCHAR(191)  NULL,
  `isFlagged`              TINYINT(1)    NOT NULL DEFAULT 0,
  `Youtube_URL`            VARCHAR(191)  NULL,
  `quickVideoUrl`          LONGTEXT      NULL,
  `registeredAt`           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status`                 VARCHAR(191)  NOT NULL DEFAULT 'pending',
  `visaSelected`           TINYINT(1)    NOT NULL DEFAULT 0,
  `visaDate`               DATETIME(3)   NULL,
  `salary`                 VARCHAR(191)  NULL DEFAULT '1000SR',
  `agency`                 VARCHAR(191)  NULL DEFAULT 'daera',
  `deployedDate`           DATETIME(3)   NULL,
  `isLocked`               TINYINT(1)    NOT NULL DEFAULT 0,
  `cvDownloaded`           TINYINT(1)    NOT NULL DEFAULT 0,
  `allowVideo`             TINYINT(1)    NOT NULL DEFAULT 0,
  `embassyIssue`           VARCHAR(191)  NOT NULL DEFAULT 'No',
  `cocStatus`              VARCHAR(191)  NOT NULL DEFAULT 'No',
  `tasheerStatus`          VARCHAR(191)  NOT NULL DEFAULT 'No',
  `wakalaStatus`           VARCHAR(191)  NOT NULL DEFAULT 'Unpaid',
  `qrCodeStatus`           VARCHAR(191)  NOT NULL DEFAULT 'No',
  `selectedType`           VARCHAR(191)  NOT NULL DEFAULT 'Private',
  `price`                  VARCHAR(191)  NULL,
  `travelDate`             DATETIME(3)   NULL,
  `agencyStatus`           VARCHAR(191)  NOT NULL DEFAULT 'Under Process',
  `agencySelected`         TINYINT(1)    NOT NULL DEFAULT 0,
  `brokerId`               VARCHAR(191)  NULL,
  `registeredById`         VARCHAR(191)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Candidate_passportNumber_key`   (`passportNumber`),
  INDEX       `Candidate_passportNumber_idx`  (`passportNumber`),
  INDEX       `Candidate_nationality_idx`     (`nationality`),
  INDEX       `Candidate_brokerId_idx`        (`brokerId`),
  INDEX       `Candidate_registeredById_idx`  (`registeredById`),
  CONSTRAINT `Candidate_brokerId_fkey`
    FOREIGN KEY (`brokerId`) REFERENCES `Broker`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Candidate_registeredById_fkey`
    FOREIGN KEY (`registeredById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 8. GENERATEDCV
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `GeneratedCV` (
  `id`               VARCHAR(191) NOT NULL,
  `candidateId`      VARCHAR(191) NOT NULL,
  `templateId`       VARCHAR(191) NOT NULL,
  `facePhotoUrl`     TEXT         NULL,
  `fullBodyPhotoUrl` TEXT         NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `GeneratedCV_candidateId_idx` (`candidateId`),
  INDEX `GeneratedCV_templateId_idx`  (`templateId`),
  CONSTRAINT `GeneratedCV_candidateId_fkey`
    FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 9. NOTIFICATION
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Notification` (
  `id`          VARCHAR(191) NOT NULL,
  `title`       VARCHAR(191) NOT NULL,
  `message`     VARCHAR(191) NOT NULL,
  `isRead`      TINYINT(1)   NOT NULL DEFAULT 0,
  `candidateId` VARCHAR(191) NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Notification_createdAt_idx` (`createdAt`),
  INDEX `Notification_isRead_idx`    (`isRead`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 10. QUICKREGISTRATION
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `QuickRegistration` (
  `id`                   VARCHAR(191)  NOT NULL,
  `passportNumber`       VARCHAR(191)  NOT NULL,
  `passportType`         VARCHAR(191)  NULL DEFAULT 'original',
  `surname`              VARCHAR(191)  NOT NULL,
  `givenNames`           VARCHAR(191)  NOT NULL,
  `dateOfBirth`          VARCHAR(191)  NULL,
  `gender`               VARCHAR(191)  NULL,
  `nationality`          VARCHAR(191)  NULL,
  `dateOfExpiry`         VARCHAR(191)  NULL,
  `issuingCountry`       VARCHAR(191)  NULL,
  `placeOfBirth`         VARCHAR(191)  NULL,
  `educationLevel`       VARCHAR(191)  NULL,
  `jobExperience`        LONGTEXT      NULL,
  `maritalStatus`        VARCHAR(191)  NULL,
  `numberOfChildren`     INT           NOT NULL DEFAULT 0,
  `passportImageUrl`     LONGTEXT      NULL,
  `religion`             VARCHAR(191)  NULL,
  `relativePhones`       JSON          NULL,
  `createdAt`            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `verificationStatus`   VARCHAR(191)  NOT NULL DEFAULT 'pending',
  `musanedCvUrl`         LONGTEXT      NULL,
  `verificationNotes`    VARCHAR(191)  NULL,
  `verifiedAt`           DATETIME(3)   NULL,
  `promotedAt`           DATETIME(3)   NULL,
  `promotedCandidateId`  VARCHAR(191)  NULL,
  `cocDocumentUrl`       LONGTEXT      NULL,
  `labourIdUrl`          LONGTEXT      NULL,
  `candidateIdImageUrl`  LONGTEXT      NULL,
  `relativeIdImageUrl`   LONGTEXT      NULL,
  `agency`               VARCHAR(191)  NULL DEFAULT 'daera',
  `videoUrl`             VARCHAR(500)  NULL,
  `languages`            JSON          NULL,
  `allowVideo`           TINYINT(1)    NOT NULL DEFAULT 0,
  `brokerId`             VARCHAR(191)  NULL,
  `registeredById`       VARCHAR(191)  NULL,
  PRIMARY KEY (`id`),
  INDEX `QuickRegistration_createdAt_idx`     (`createdAt`),
  INDEX `QuickRegistration_brokerId_idx`      (`brokerId`),
  INDEX `QuickRegistration_registeredById_idx` (`registeredById`),
  CONSTRAINT `QuickRegistration_brokerId_fkey`
    FOREIGN KEY (`brokerId`) REFERENCES `Broker`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 11. INVOICE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Invoice` (
  `id`            VARCHAR(191) NOT NULL,
  `candidateId`   VARCHAR(191) NOT NULL,
  `lmisQrCodeUrl` TEXT         NOT NULL,
  `insuranceUrl`  TEXT         NOT NULL,
  `ticketUrl`     TEXT         NOT NULL,
  `price`         VARCHAR(191) NOT NULL,
  `isDelivered`   TINYINT(1)   NOT NULL DEFAULT 0,
  `deployedDate`  DATETIME(3)  NULL,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Invoice_candidateId_idx` (`candidateId`),
  CONSTRAINT `Invoice_candidateId_fkey`
    FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 12. PREREGISTEREDVIDEO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `PreRegisteredVideo` (
  `id`               VARCHAR(191) NOT NULL,
  `passportNumber`   VARCHAR(191) NOT NULL,
  `videoUrl`         TEXT         NOT NULL,
  `facePhotoUrl`     TEXT         NULL,
  `fullBodyPhotoUrl` TEXT         NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PreRegisteredVideo_passportNumber_key` (`passportNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 13. PASSPORT
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Passport` (
  `id`               VARCHAR(191) NOT NULL,
  `shelfNo`          VARCHAR(191) NOT NULL,
  `fullName`         VARCHAR(191) NOT NULL,
  `passportNumber`   VARCHAR(191) NOT NULL,
  `passportImageUrl` LONGTEXT     NULL,
  `status`           VARCHAR(191) NOT NULL DEFAULT 'Available',
  `takenReason`      VARCHAR(191) NULL,
  `takenByName`      VARCHAR(191) NULL,
  `takenByPhone`     VARCHAR(191) NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Passport_passportNumber_key` (`passportNumber`),
  INDEX       `Passport_passportNumber_idx` (`passportNumber`),
  INDEX       `Passport_status_idx`         (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- 14. TEMPLATEPRICE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `TemplatePrice` (
  `templateId` VARCHAR(191) NOT NULL,
  `price`      VARCHAR(191) NOT NULL,
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`templateId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ────────────────────────────────────────────────────────────
-- Re-enable FK checks
-- ────────────────────────────────────────────────────────────
SET foreign_key_checks = 1;

-- ============================================================
-- Done — 14 tables created in skyforoo_db
-- ============================================================
