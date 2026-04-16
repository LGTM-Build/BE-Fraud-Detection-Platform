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

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
