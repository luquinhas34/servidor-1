// prisma/seed.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const materias = [
    { nome: "Matemática" },
    { nome: "Português" },
    { nome: "História" },
    { nome: "Geografia" },
    { nome: "Química" },
  ];

  for (const materia of materias) {
    await prisma.materia.upsert({
      where: { nome: materia.nome },
      update: {},
      create: materia,
    });
  }

  console.log("✅ Matérias inseridas com sucesso!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
