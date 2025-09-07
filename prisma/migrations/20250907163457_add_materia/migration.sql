/*
  Warnings:

  - You are about to drop the column `professor` on the `materia` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nome]` on the table `Materia` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `horario` DROP FOREIGN KEY `Horario_materiaId_fkey`;

-- DropForeignKey
ALTER TABLE `turmamateria` DROP FOREIGN KEY `TurmaMateria_materiaId_fkey`;

-- DropIndex
DROP INDEX `Horario_materiaId_fkey` ON `horario`;

-- DropIndex
DROP INDEX `TurmaMateria_materiaId_fkey` ON `turmamateria`;

-- AlterTable
ALTER TABLE `horario` MODIFY `materiaId` INTEGER NULL;

-- AlterTable
ALTER TABLE `materia` DROP COLUMN `professor`;

-- CreateIndex
CREATE UNIQUE INDEX `Materia_nome_key` ON `Materia`(`nome`);

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_materiaId_fkey` FOREIGN KEY (`materiaId`) REFERENCES `Materia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
