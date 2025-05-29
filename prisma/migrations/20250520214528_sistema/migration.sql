-- CreateTable
CREATE TABLE `Calendario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `ano` INTEGER NOT NULL,
    `semestre` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventoCalendario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data` DATETIME(3) NOT NULL,
    `tipo` ENUM('INICIO_BIMESTRE', 'RECESSO', 'SABADO_LETIVO', 'FERIADO') NOT NULL,
    `calendarioId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventoCalendario` ADD CONSTRAINT `EventoCalendario_calendarioId_fkey` FOREIGN KEY (`calendarioId`) REFERENCES `Calendario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
