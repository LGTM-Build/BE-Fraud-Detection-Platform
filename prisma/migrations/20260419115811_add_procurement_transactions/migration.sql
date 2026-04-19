-- CreateTable
CREATE TABLE `companies` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `industry` VARCHAR(100) NULL,
    `employeeCount` INTEGER NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NULL,
    `fullName` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('super_admin', 'super_user', 'auditor', 'operator', 'department_head') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_companyId_idx`(`companyId`),
    INDEX `users_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `fullName` VARCHAR(255) NOT NULL,
    `phoneNumber` VARCHAR(50) NOT NULL,
    `department` VARCHAR(100) NULL,
    `position` VARCHAR(100) NULL,
    `avgMonthlyExpense` DECIMAL(15, 2) NULL,
    `externalRef` VARCHAR(100) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `employees_companyId_idx`(`companyId`),
    UNIQUE INDEX `employees_companyId_phoneNumber_key`(`companyId`, `phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `refreshTokenHash` VARCHAR(255) NOT NULL,
    `ipAddress` VARCHAR(100) NULL,
    `userAgent` VARCHAR(500) NULL,
    `status` ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    `lastUsedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_sessions_companyId_idx`(`companyId`),
    INDEX `user_sessions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `targetType` VARCHAR(50) NOT NULL,
    `targetId` CHAR(36) NULL,
    `note` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_companyId_idx`(`companyId`),
    INDEX `audit_logs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `vendorName` VARCHAR(255) NOT NULL,
    `vendorRegistrationDate` DATETIME(3) NULL,
    `vendorBankAccount` VARCHAR(100) NULL,
    `vendorAddress` VARCHAR(255) NULL,
    `vendorContact` VARCHAR(255) NULL,
    `externalRef` VARCHAR(100) NULL,
    `metadata` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('active', 'inactive', 'blacklisted') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendors_companyId_idx`(`companyId`),
    UNIQUE INDEX `vendors_companyId_externalRef_key`(`companyId`, `externalRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_transactions` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `vendorId` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NULL,
    `purchaseId` VARCHAR(100) NULL,
    `poNumber` VARCHAR(100) NULL,
    `purchaseDate` DATETIME(3) NOT NULL,
    `itemId` VARCHAR(100) NULL,
    `itemDescription` TEXT NULL,
    `quantity` DECIMAL(15, 2) NULL,
    `unitPrice` DECIMAL(15, 2) NULL,
    `amountTotal` DECIMAL(15, 2) NOT NULL,
    `department` VARCHAR(100) NULL,
    `method` ENUM('pengadaan_langsung', 'tender_terbuka', 'tender_tertutup', 'e_purchasing', 'rfp', 'lainnya') NOT NULL DEFAULT 'lainnya',
    `approvalDate` DATETIME(3) NULL,
    `invoiceNumber` VARCHAR(100) NULL,
    `invoiceDate` DATETIME(3) NULL,
    `location` VARCHAR(100) NULL,
    `contractId` VARCHAR(100) NULL,
    `contractDate` DATETIME(3) NULL,
    `paymentDate` DATETIME(3) NULL,
    `status` ENUM('pending', 'reviewed', 'requires_attention', 'need_further_review') NOT NULL DEFAULT 'pending',
    `reviewerNote` TEXT NULL,
    `reviewedBy` CHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `importBatchId` CHAR(36) NULL,
    `metadata` JSON NULL,
    `createdBy` CHAR(36) NOT NULL,
    `updatedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `procurement_transactions_companyId_idx`(`companyId`),
    INDEX `procurement_transactions_vendorId_idx`(`vendorId`),
    INDEX `procurement_transactions_employeeId_idx`(`employeeId`),
    INDEX `procurement_transactions_status_idx`(`status`),
    INDEX `procurement_transactions_purchaseDate_idx`(`purchaseDate`),
    INDEX `procurement_transactions_invoiceNumber_idx`(`invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fraud_analysis_results` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `procurementId` CHAR(36) NOT NULL,
    `analysisType` ENUM('supervised', 'anomaly') NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    `isFraud` BOOLEAN NULL,
    `fraudScore` DOUBLE NULL,
    `flags` JSON NULL,
    `features` JSON NULL,
    `rawResponse` JSON NULL,
    `requestedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `fraud_analysis_results_companyId_idx`(`companyId`),
    INDEX `fraud_analysis_results_procurementId_idx`(`procurementId`),
    INDEX `fraud_analysis_results_analysisType_idx`(`analysisType`),
    INDEX `fraud_analysis_results_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_transactions` ADD CONSTRAINT `procurement_transactions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_transactions` ADD CONSTRAINT `procurement_transactions_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_transactions` ADD CONSTRAINT `procurement_transactions_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fraud_analysis_results` ADD CONSTRAINT `fraud_analysis_results_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fraud_analysis_results` ADD CONSTRAINT `fraud_analysis_results_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `procurement_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
