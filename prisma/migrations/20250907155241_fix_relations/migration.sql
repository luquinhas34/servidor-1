/*
  Warnings:

  - You are about to drop the column `turmaIdt` on the `calendario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[turmaId]` on the table `Calendario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `turmaId` to the `Calendario` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `calendario` DROP FOREIGN KEY `Calendario_turmaIdt_fkey`;

-- DropIndex
DROP INDEX `Calendario_turmaIdt_key` ON `calendario`;

-- AlterTable
ALTER TABLE `calendario` DROP COLUMN `turmaIdt`,
    ADD COLUMN `turmaId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `horario` ADD COLUMN `materiaId` INTEGER NULL,
    MODIFY `atividade` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Materia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Materia_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TurmaMateria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `turmaId` INTEGER NOT NULL,
    `materiaId` INTEGER NOT NULL,

    UNIQUE INDEX `TurmaMateria_turmaId_materiaId_key`(`turmaId`, `materiaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Calendario_turmaId_key` ON `Calendario`(`turmaId`);

-- AddForeignKey
ALTER TABLE `TurmaMateria` ADD CONSTRAINT `TurmaMateria_turmaId_fkey` FOREIGN KEY (`turmaId`) REFERENCES `Turma`(`idt`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurmaMateria` ADD CONSTRAINT `TurmaMateria_materiaId_fkey` FOREIGN KEY (`materiaId`) REFERENCES `Materia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_materiaId_fkey` FOREIGN KEY (`materiaId`) REFERENCES `Materia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calendario` ADD CONSTRAINT `Calendario_turmaId_fkey` FOREIGN KEY (`turmaId`) REFERENCES `Turma`(`idt`) ON DELETE RESTRICT ON UPDATE CASCADE;
