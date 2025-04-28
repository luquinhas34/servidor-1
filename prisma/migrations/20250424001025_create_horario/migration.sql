-- CreateTable
CREATE TABLE `ResponsavelAluno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `responsavelId` INTEGER NOT NULL,
    `alunoId` INTEGER NOT NULL,

    UNIQUE INDEX `ResponsavelAluno_responsavelId_alunoId_key`(`responsavelId`, `alunoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Horario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dia` VARCHAR(191) NOT NULL,
    `turno` VARCHAR(191) NOT NULL,
    `atividade` VARCHAR(191) NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFim` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ResponsavelAluno` ADD CONSTRAINT `ResponsavelAluno_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResponsavelAluno` ADD CONSTRAINT `ResponsavelAluno_alunoId_fkey` FOREIGN KEY (`alunoId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
