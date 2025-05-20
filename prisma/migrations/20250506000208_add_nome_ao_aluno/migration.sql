/*
  Warnings:

  - Added the required column `senha` to the `Aluno` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `aluno` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `Aluno_cpf_key` ON `aluno`;

-- AlterTable
ALTER TABLE `aluno` ADD COLUMN `senha` VARCHAR(191) NOT NULL,
    MODIFY `email` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `presencas` ADD CONSTRAINT `presencas_alunoId_fkey` FOREIGN KEY (`alunoId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
