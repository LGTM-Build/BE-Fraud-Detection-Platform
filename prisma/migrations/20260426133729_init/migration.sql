-- CreateTable
CREATE TABLE `companies` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `industry` VARCHAR(100) NULL,
    `employeeCount` INTEGER NULL,
    `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
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
    `role` ENUM('Super Admin', 'Super User', 'Auditor', 'Operator', 'Department Head') NOT NULL,
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
    `externalRef` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `employees_companyId_idx`(`companyId`),
    UNIQUE INDEX `employees_companyId_externalRef_key`(`companyId`, `externalRef`),
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
    `metadata` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('Active', 'Inactive', 'Blacklisted') NOT NULL DEFAULT 'Active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendors_companyId_idx`(`companyId`),
    UNIQUE INDEX `vendors_companyId_vendorName_key`(`companyId`, `vendorName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_transactions` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NULL,
    `purchaseId` VARCHAR(100) NULL,
    `purchaseDate` DATETIME(3) NOT NULL,
    `vendorName` VARCHAR(255) NOT NULL,
    `itemDescription` TEXT NOT NULL,
    `department` VARCHAR(100) NULL,
    `amountTotal` DECIMAL(15, 2) NOT NULL,
    `procurementMethod` ENUM('Pengadaan Langsung', 'Tender Terbuka', 'tender Tertutup', 'E-Purchasing', 'RFP', 'Lainnya') NOT NULL DEFAULT 'Lainnya',
    `status` ENUM('Pending', 'Alert', 'High Alert', 'Auto Approved', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `flags` JSON NULL,
    `fraudScore` DOUBLE NULL,
    `aiExplanation` TEXT NULL,
    `createdBy` CHAR(36) NOT NULL,
    `updatedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `procurement_transactions_companyId_idx`(`companyId`),
    INDEX `procurement_transactions_employeeId_idx`(`employeeId`),
    INDEX `procurement_transactions_status_idx`(`status`),
    INDEX `procurement_transactions_purchaseDate_idx`(`purchaseDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `expenseId` VARCHAR(100) NULL,
    `expenseDate` DATETIME(3) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('Entertainment', 'Transport', 'Office Supply', 'Meals', 'Vehicle', 'Training', 'Others') NOT NULL DEFAULT 'Others',
    `merchant` VARCHAR(255) NULL,
    `amountTotal` DECIMAL(15, 2) NOT NULL,
    `department` VARCHAR(100) NULL,
    `status` ENUM('Pending', 'Alert', 'High Alert', 'Auto Approved', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `flags` JSON NULL,
    `fraudScore` DOUBLE NULL,
    `aiExplanation` TEXT NULL,
    `createdBy` CHAR(36) NOT NULL,
    `updatedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expenses_companyId_idx`(`companyId`),
    INDEX `expenses_employeeId_idx`(`employeeId`),
    INDEX `expenses_status_idx`(`status`),
    INDEX `expenses_expenseDate_idx`(`expenseDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fraud_analysis_results` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `procurementId` CHAR(36) NULL,
    `expenseId` CHAR(36) NULL,
    `analysisType` ENUM('supervised', 'anomaly') NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    `isFraud` BOOLEAN NULL,
    `fraudScore` DOUBLE NULL,
    `flags` JSON NULL,
    `aiExplanation` TEXT NULL,
    `features` JSON NULL,
    `rawResponse` JSON NULL,
    `requestedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `fraud_analysis_results_companyId_idx`(`companyId`),
    INDEX `fraud_analysis_results_procurementId_idx`(`procurementId`),
    INDEX `fraud_analysis_results_expenseId_idx`(`expenseId`),
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
ALTER TABLE `procurement_transactions` ADD CONSTRAINT `procurement_transactions_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fraud_analysis_results` ADD CONSTRAINT `fraud_analysis_results_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fraud_analysis_results` ADD CONSTRAINT `fraud_analysis_results_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `procurement_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fraud_analysis_results` ADD CONSTRAINT `fraud_analysis_results_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
