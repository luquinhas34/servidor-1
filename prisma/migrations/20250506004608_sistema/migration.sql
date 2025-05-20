/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Professor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Professor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `professor` ADD COLUMN `userId` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Professor_userId_key` ON `Professor`(`userId`);

-- AddForeignKey
ALTER TABLE `Professor` ADD CONSTRAINT `Professor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
