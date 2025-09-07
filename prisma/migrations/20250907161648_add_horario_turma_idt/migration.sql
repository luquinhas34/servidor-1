/*
  Warnings:

  - You are about to drop the column `atividade` on the `horario` table. All the data in the column will be lost.
  - You are about to drop the column `turmaId` on the `horario` table. All the data in the column will be lost.
  - Added the required column `turmaIdt` to the `Horario` table without a default value. This is not possible if the table is not empty.
  - Made the column `materiaId` on table `horario` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `horario` DROP FOREIGN KEY `Horario_materiaId_fkey`;

-- DropForeignKey
ALTER TABLE `horario` DROP FOREIGN KEY `Horario_turmaId_fkey`;

-- DropIndex
DROP INDEX `Horario_materiaId_fkey` ON `horario`;

-- DropIndex
DROP INDEX `Horario_turmaId_fkey` ON `horario`;

-- DropIndex
DROP INDEX `Materia_nome_key` ON `materia`;

-- AlterTable
ALTER TABLE `horario` DROP COLUMN `atividade`,
    DROP COLUMN `turmaId`,
    ADD COLUMN `turmaIdt` INTEGER NOT NULL,
    MODIFY `materiaId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `materia` ADD COLUMN `professor` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_turmaIdt_fkey` FOREIGN KEY (`turmaIdt`) REFERENCES `Turma`(`idt`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_materiaId_fkey` FOREIGN KEY (`materiaId`) REFERENCES `Materia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
