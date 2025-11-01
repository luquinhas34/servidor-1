// Usa 'import' em vez de 'require'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Lista de matérias que você quer pré-cadastrar
const materiasParaCadastrar = [
  "Matemática",
  "Português",
  "História",
  "Geografia",
  "Ciências",
  "Inglês",
  "Educação Física",
  "Artes",
  "Filosofia",
  "Sociologia",
  "Física",
  "Química",
  "Biologia",
  "Intervalo",
  "Sem Aula",
];

async function main() {
  console.log("Iniciando o seeding de matérias...");

  const dadosMaterias = materiasParaCadastrar.map((nome) => ({
    nome: nome,
  }));

  // Insere todas de uma vez, pulando duplicatas
  const resultado = await prisma.materia.createMany({
    data: dadosMaterias,
    skipDuplicates: true,
  });

  console.log(`${resultado.count} novas matérias foram cadastradas.`);
  console.log("Seeding de matérias finalizado.");
}

// Executa a função e fecha a conexão
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
