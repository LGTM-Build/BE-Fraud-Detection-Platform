-- CreateIndex
CREATE INDEX `expenses_createdBy_idx` ON `expenses`(`createdBy`);

-- CreateIndex
CREATE INDEX `expenses_updatedBy_idx` ON `expenses`(`updatedBy`);

-- CreateIndex
CREATE INDEX `procurement_transactions_createdBy_idx` ON `procurement_transactions`(`createdBy`);

-- CreateIndex
CREATE INDEX `procurement_transactions_updatedBy_idx` ON `procurement_transactions`(`updatedBy`);

-- AddForeignKey
ALTER TABLE `procurement_transactions` ADD CONSTRAINT `procurement_transactions_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_transactions` ADD CONSTRAINT `procurement_transactions_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
