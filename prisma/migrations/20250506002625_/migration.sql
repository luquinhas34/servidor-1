-- CreateTable
CREATE TABLE `Professor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `dataNascimento` DATETIME(3) NOT NULL,
    `cpfMae` VARCHAR(191) NOT NULL,
    `cpfPai` VARCHAR(191) NOT NULL,
    `areaAtuacao` VARCHAR(191) NOT NULL,
    `formacao` VARCHAR(191) NOT NULL,
    `matricula` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'professor',

    UNIQUE INDEX `Professor_email_key`(`email`),
    UNIQUE INDEX `Professor_cpf_key`(`cpf`),
    UNIQUE INDEX `Professor_matricula_key`(`matricula`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
