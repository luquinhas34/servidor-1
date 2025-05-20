/*
  Warnings:

  - You are about to drop the column `areaAtuacao` on the `professor` table. All the data in the column will be lost.
  - You are about to drop the column `formacao` on the `professor` table. All the data in the column will be lost.
  - Added the required column `senha` to the `Professor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Professor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `professor` DROP COLUMN `areaAtuacao`,
    DROP COLUMN `formacao`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `senha` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;
