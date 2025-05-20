/*
  Warnings:

  - You are about to drop the column `cpfMae` on the `professor` table. All the data in the column will be lost.
  - You are about to drop the column `cpfPai` on the `professor` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `professor` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `professor` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Professor_cpf_key` ON `professor`;

-- DropIndex
DROP INDEX `Professor_email_key` ON `professor`;

-- DropIndex
DROP INDEX `Professor_matricula_key` ON `professor`;

-- AlterTable
ALTER TABLE `professor` DROP COLUMN `cpfMae`,
    DROP COLUMN `cpfPai`,
    DROP COLUMN `password`,
    DROP COLUMN `role`,
    MODIFY `areaAtuacao` VARCHAR(191) NULL;
