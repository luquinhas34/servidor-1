/*
  Warnings:

  - You are about to drop the column `createdAt` on the `mensagem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,chatId]` on the table `ChatParticipante` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `mensagem` DROP COLUMN `createdAt`,
    ADD COLUMN `lida` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `texto` TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ChatParticipante_userId_chatId_key` ON `ChatParticipante`(`userId`, `chatId`);
