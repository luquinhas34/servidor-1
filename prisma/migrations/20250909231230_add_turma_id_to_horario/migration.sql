/*
  Warnings:

  - You are about to drop the column `turmaIdt` on the `horario` table. All the data in the column will be lost.
  - Added the required column `turmaId` to the `Horario` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `horario` DROP FOREIGN KEY `Horario_turmaIdt_fkey`;

-- DropIndex
DROP INDEX `Horario_turmaIdt_fkey` ON `horario`;

-- AlterTable
ALTER TABLE `horario` DROP COLUMN `turmaIdt`,
    ADD COLUMN `turmaId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_turmaId_fkey` FOREIGN KEY (`turmaId`) REFERENCES `Turma`(`idt`) ON DELETE RESTRICT ON UPDATE CASCADE;
