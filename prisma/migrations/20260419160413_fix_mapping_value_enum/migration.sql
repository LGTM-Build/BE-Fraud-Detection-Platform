/*
  Warnings:

  - You are about to alter the column `status` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(0))`.
  - The values [supervised,anomaly] on the enum `fraud_analysis_results_analysisType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `status` on the `fraud_analysis_results` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `Enum(EnumId(7))`.
  - You are about to alter the column `method` on the `procurement_transactions` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(6))` to `Enum(EnumId(4))`.
  - You are about to alter the column `status` on the `procurement_transactions` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(7))` to `Enum(EnumId(5))`.
  - The values [super_admin,super_user,auditor,operator,department_head] on the enum `users_role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `status` on the `vendors` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `Enum(EnumId(3))`.

*/
-- AlterTable
ALTER TABLE `companies` MODIFY `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE `fraud_analysis_results` MODIFY `analysisType` ENUM('Supervised', 'Anomaly') NOT NULL,
    MODIFY `status` ENUM('Pending', 'Processing', 'Completed', 'Failed') NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `procurement_transactions` MODIFY `method` ENUM('Pengadaan Langsung', 'Tender Terbuka', 'tender Tertutup', 'E-Purchasing', 'RFP', 'Lainnya') NOT NULL DEFAULT 'Lainnya',
    MODIFY `status` ENUM('Pending', 'Reviewed', 'Requires Attention', 'Need Further Review') NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('Super Admin', 'Super User', 'Auditor', 'Operator', 'Department Head') NOT NULL;

-- AlterTable
ALTER TABLE `vendors` MODIFY `status` ENUM('Active', 'Inactive', 'Blacklisted') NOT NULL DEFAULT 'Active';
