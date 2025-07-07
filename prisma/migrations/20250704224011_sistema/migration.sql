/*
  Warnings:

  - A unique constraint covering the columns `[turmaIdt]` on the table `Calendario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `turmaIdt` to the `Calendario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `turmaIdt` to the `Horario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `calendario` ADD COLUMN `turmaIdt` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `horario` ADD COLUMN `turmaIdt` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Calendario_turmaIdt_key` ON `Calendario`(`turmaIdt`);

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_turmaIdt_fkey` FOREIGN KEY (`turmaIdt`) REFERENCES `Turma`(`idt`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calendario` ADD CONSTRAINT `Calendario_turmaIdt_fkey` FOREIGN KEY (`turmaIdt`) REFERENCES `Turma`(`idt`) ON DELETE RESTRICT ON UPDATE CASCADE;
