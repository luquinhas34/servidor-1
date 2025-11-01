import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// --------- IMPORTANTE: FUNÇÃO DE AUTENTICAÇÃO ---------
// (A mesma função mockada de antes)
// Você DEVE substituir isso pela sua lógica real
async function getUsuarioLogado(req) {
  // MOCK: Fingindo ser o 'aluno@exemplo.com'
  // Na vida real, você pegaria isso de um token/sessão
  const usuario = await prisma.user.findUnique({
    where: { email: "aluno@exemplo.com" },
  });

  if (!usuario) {
    console.error("Usuário de mock não encontrado. Crie-o no banco.");
    return null;
  }
  return usuario;
}
// ----------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // 1. Validar a autenticação
    const remetente = await getUsuarioLogado(req);
    if (!remetente) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    // 2. Validar os dados recebidos (o que o front-end enviou)
    const { destinatarioId, texto } = req.body;
    if (!destinatarioId || !texto) {
      return res
        .status(400)
        .json({ error: "destinatarioId e texto são obrigatórios" });
    }

    if (remetente.id === destinatarioId) {
      return res
        .status(400)
        .json({ error: "Você não pode enviar uma mensagem para si mesmo" });
    }

    // 3. Lógica Principal: Encontrar ou Criar o Chat 1-para-1
    // (Esta é a parte mais importante)

    const idsDosParticipantes = [remetente.id, destinatarioId];

    // Procuramos um chat que tenha EXATAMENTE estes dois participantes
    let chat = await prisma.chat.findFirst({
      where: {
        AND: [
          // Onde um participante é o remetente
          { participantes: { some: { userId: remetente.id } } },
          // E o outro participante é o destinatário
          { participantes: { some: { userId: destinatarioId } } },
          // E só existem 2 participantes no total (garante que é 1-para-1)
          { participantes: { count: 2 } },
        ],
      },
    });

    // 4. Se o chat NÃO existir, criamos um novo
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          // Cria o chat e os participantes de uma vez
          participantes: {
            create: [{ userId: remetente.id }, { userId: destinatarioId }],
          },
        },
      });
    }

    // 5. Agora que temos o 'chat.id', criamos a mensagem
    const novaMensagem = await prisma.mensagem.create({
      data: {
        texto: texto,
        remetenteId: remetente.id,
        chatId: chat.id,
        lida: false, // Começa como não lida para o destinatário
      },
      include: {
        remetente: {
          // Inclui os dados do remetente na resposta
          select: { id: true, name: true, role: true },
        },
      },
    });

    // (Opcional, mas recomendado:
    // Atualizar o 'updatedAt' do chat força ele a ir para o topo da lista)
    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    // 6. Resposta: Sucesso
    // Retornamos a mensagem criada, o front-end pode usá-la
    // para atualizar a tela em tempo real.
    res.status(201).json(novaMensagem);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
