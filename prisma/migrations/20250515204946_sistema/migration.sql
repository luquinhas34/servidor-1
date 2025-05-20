/*
  Warnings:

  - You are about to drop the column `senha` on the `professor` table. All the data in the column will be lost.
  - Added the required column `password` to the `Professor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `professor` DROP COLUMN `senha`,
    ADD COLUMN `password` VARCHAR(191) NOT NULL;
