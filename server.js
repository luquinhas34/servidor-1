import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import auth from "./middlewares/auth.js";
import multer from "multer";
const app = express();

dotenv.config();

const prisma = new PrismaClient();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const horarios = await prisma.horario.findMany();

app.use(cors());
app.use(express.json());

// Conectar ao banco de dados
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("Conectado ao banco de dados!");
  } catch (error) {
    console.error("Erro ao conectar com o banco de dados:", error);
    process.exit(1);
  }
}
connectDatabase();

// Rota de cadastro de usuário
app.post("/api/cadastro", async (req, res) => {
  try {
    const { email, name, password, role } = req.body;

    if (!email || !name || !password || !role) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "E-mail inválido." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email já cadastrado!" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const userDB = await prisma.user.create({
      data: { email, name, password: hashPassword, role },
    });

    res.status(201).json({
      message: "Usuário cadastrado com sucesso!",
      user: {
        id: userDB.id,
        email: userDB.email,
        name: userDB.name,
        role: userDB.role,
      },
    });
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ message: "Erro no servidor, tente novamente!" });
  }
});

// Rota de login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email e senha são obrigatórios." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login realizado com sucesso!",
      token,
      role: user.role,
    });
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ message: "Erro no servidor, tente novamente!" });
  }
});
// Protege as rotas abaixo com o middleware de autenticação
app.use("/api/atividades", auth);
app.use("/api/avaliacoes", auth);

// Rota para pegar os dados do usuário logado ("/api/me")
app.get("/api/me", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
    res.status(500).json({ message: "Erro ao buscar dados do usuário." });
  }
});

// Exemplo de rota para pegar usuários
app.get("/api/usuarios", async (req, res) => {
  try {
    const usuarios = await prisma.user.findMany();
    res.json(usuarios);
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota de busca de atividades
app.get("/api/atividades", async (req, res) => {
  try {
    const atividades = await prisma.atividade.findMany({
      include: {
        turma: true, // se quiser detalhes da turma
        user: true, // se quiser detalhes do professor
      },
    });
    res.json(atividades);
  } catch (error) {
    console.error("Erro ao buscar atividades:", error);
    res.status(500).json({ message: "Erro ao buscar atividades." });
  }
});

app.post(
  "/api/atividades",
  auth,
  upload.single("documento"),
  async (req, res) => {
    try {
      console.log("Dados do corpo da requisição:", req.body);
      console.log("Arquivo enviado:", req.file);

      const { titulo, descricao, dataInicio, dataFim, turmaId, userId } =
        req.body;

      // Verificação de campos obrigatórios
      if (!titulo || !descricao || !turmaId || !userId) {
        return res
          .status(400)
          .json({ message: "Campos obrigatórios ausentes!" });
      }

      // Convertendo datas de forma segura
      const dataInicioParsed = isNaN(Date.parse(dataInicio))
        ? null
        : new Date(dataInicio);
      const dataFimParsed = isNaN(Date.parse(dataFim))
        ? null
        : new Date(dataFim);

      if (!dataInicioParsed || !dataFimParsed) {
        return res.status(400).json({ message: "Datas inválidas!" });
      }

      // Convertendo IDs de forma segura
      const turmaIdParsed = Number(turmaId);
      const userIdParsed = Number(userId);

      if (isNaN(turmaIdParsed) || isNaN(userIdParsed)) {
        return res.status(400).json({ message: "IDs inválidos!" });
      }

      // Verificar se o usuário existe
      const userExists = await prisma.user.findUnique({
        where: { id: userIdParsed },
      });

      if (!userExists) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      // Criar atividade
      const atividade = await prisma.atividade.create({
        data: {
          titulo,
          descricao,
          dataInicio: dataInicioParsed,
          dataFim: dataFimParsed,
          turma: { connect: { id: turmaIdParsed } },
          documento: req.file ? req.file.buffer : null,
          user: { connect: { id: userIdParsed } },
        },
      });

      res.status(201).json({
        message: "Atividade criada com sucesso!",
        atividade,
      });
    } catch (err) {
      console.error("Erro ao criar atividade:", err);
      res.status(500).json({ message: "Erro no servidor, tente novamente!" });
    }
  }
);

app.delete("/api/atividades/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const atividadeExistente = await prisma.atividade.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!atividadeExistente) {
      return res.status(404).json({ message: "Atividade não encontrada." });
    }

    await prisma.atividade.delete({ where: { id: parseInt(id, 10) } });
    res.status(200).json({ message: "Atividade removida com sucesso!" });
  } catch (err) {
    console.error("Erro ao remover atividade:", err);
    res.status(500).json({ message: "Erro ao remover atividade." });
  }
});
// Rota de atualização de atividade
app.patch(
  "/api/atividades/:id",
  auth,
  upload.single("documento"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { titulo, descricao, dataInicio, dataFim, turma } = req.body;

      if (
        !titulo &&
        !descricao &&
        !dataInicio &&
        !dataFim &&
        !turma &&
        !req.file
      ) {
        return res.status(400).json({
          message: "Pelo menos um campo deve ser fornecido para atualização.",
        });
      }

      const atividadeExistente = await prisma.atividade.findUnique({
        where: { id: parseInt(id, 10) },
      });
      if (!atividadeExistente) {
        return res.status(404).json({ message: "Atividade não encontrada." });
      }

      const atividadeAtualizada = await prisma.atividade.update({
        where: { id: parseInt(id, 10) },
        data: {
          titulo: titulo || atividadeExistente.titulo,
          descricao: descricao || atividadeExistente.descricao,
          dataInicio: dataInicio
            ? new Date(dataInicio)
            : atividadeExistente.dataInicio,
          dataFim: dataFim ? new Date(dataFim) : atividadeExistente.dataFim,
          turma: turma || atividadeExistente.turma,
          documento: req.file ? req.file.buffer : atividadeExistente.documento,
        },
      });

      res.status(200).json({
        message: "Atividade atualizada com sucesso!",
        atividade: atividadeAtualizada,
      });
    } catch (err) {
      console.error("Erro ao atualizar atividade:", err);
      res.status(500).json({ message: "Erro ao atualizar atividade." });
    }
  }
);

// Rota de criação de avaliações
app.post("/api/avaliacoes", upload.single("documento"), async (req, res) => {
  const { titulo, descricao, dataInicio, dataFim, turmaId, userId } = req.body;

  // Converte para número
  const turmaIdNum = Number(turmaId);
  const userIdNum = Number(userId);

  if (!titulo || !descricao || !dataInicio || !dataFim || !turmaId || !userId) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  const turma = await prisma.turma.findUnique({ where: { id: turmaIdNum } });
  const usuario = await prisma.user.findUnique({ where: { id: userIdNum } });

  if (!turma || !usuario) {
    return res
      .status(404)
      .json({ message: "Turma ou usuário não encontrados." });
  }

  try {
    const avaliacao = await prisma.avaliacao.create({
      data: {
        titulo,
        descricao,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        turmaId: turmaIdNum,
        userId: userIdNum,
      },
    });
    return res.status(201).json(avaliacao);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao criar avaliação." });
  }
});

// Rota para listar as turmas
app.get("/api/turmas", async (req, res) => {
  try {
    const turmas = await prisma.turma.findMany();
    res.status(200).json(turmas);
  } catch (error) {
    console.error("Erro ao buscar turmas:", error);
    res.status(500).json({ error: "Erro ao buscar turmas" });
  }
});

app.get("/api/avaliacoes", auth, async (req, res) => {
  try {
    const avaliacoes = await prisma.avaliacao.findMany();
    res.status(200).json(avaliacoes);
  } catch (err) {
    console.error("Erro ao buscar avaliações:", err);
    res.status(500).json({ message: "Erro ao buscar avaliações." });
  }
});

// Rota de deletação de avaliações
app.delete("/api/avaliacoes/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se a avaliação existe
    const avaliacaoExistente = await prisma.avaliacao.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!avaliacaoExistente) {
      return res.status(404).json({ message: "Avaliação não encontrada." });
    }

    // Deleta a avaliação
    await prisma.avaliacao.delete({ where: { id: parseInt(id, 10) } });

    // Resposta de sucesso
    res.status(200).json({ message: "Avaliação removida com sucesso!" });
  } catch (err) {
    console.error("Erro ao remover avaliação:", err);
    res.status(500).json({ message: "Erro ao remover avaliação." });
  }
});

// Rota de atualização de avaliações
app.patch(
  "/api/avaliacoes/:id",
  auth,
  upload.single("documento"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { titulo, descricao, dataInicio, dataFim, turma } = req.body;

      if (
        !titulo &&
        !descricao &&
        !dataInicio &&
        !dataFim &&
        !turma &&
        !req.file
      ) {
        return res.status(400).json({
          message: "Pelo menos um  deve ser fornecido para atualização.",
        });
      }

      const avaliacaoExistente = await prisma.avaliacao.findUnique({
        where: { id: parseInt(id, 10) },
      });
      if (!avaliacaoExistente) {
        return res.status(404).json({ message: "Avaliação não encontrada." });
      }

      const avaliacaoAtualizada = await prisma.avaliacao.update({
        where: { id: parseInt(id, 10) },
        data: {
          titulo: titulo || avaliacaoExistente.titulo,
          descricao: descricao || avaliacaoExistente.descricao,
          dataInicio: dataInicio
            ? new Date(dataInicio)
            : avaliacaoExistente.dataInicio,
          dataFim: dataFim ? new Date(dataFim) : avaliacaoExistente.dataFim,
          turma: turma || avaliacaoExistente.turma,
          documento: req.file ? req.file.buffer : avaliacaoExistente.documento,
        },
      });

      res.status(200).json({
        message: "Avaliação atualizada com sucesso!",
        avaliacao: avaliacaoAtualizada,
      });
    } catch (err) {
      console.error("Erro ao atualizar avaliação:", err);
      res.status(500).json({ message: "Erro ao atualizar avaliação." });
    }
  }
);

// Rota para criar um aviso
app.post("/api/avisos", auth, async (req, res) => {
  const { titulo, descricao } = req.body;

  // Validação de entrada
  if (!titulo || !descricao) {
    return res
      .status(400)
      .json({ message: "Título e descrição são obrigatórios." });
  }

  try {
    const aviso = await prisma.aviso.create({
      data: {
        titulo,
        descricao,
        userId: req.userId, // Obtendo o userId do token JWT
      },
    });
    res.status(201).json({ aviso: { titulo, descricao } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rota para listar avisos
app.get("/api/avisos", async (req, res) => {
  try {
    const avisos = await prisma.aviso.findMany();
    res.status(200).json(avisos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/avisos/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const avisoExistente = await prisma.aviso.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!avisoExistente) {
      return res.status(404).json({ message: "Aviso não encontrado." });
    }

    await prisma.aviso.delete({ where: { id: parseInt(id, 10) } });
    res.status(200).json({ message: "Aviso removido com sucesso!" });
  } catch (err) {
    console.error("Erro ao remover aviso:", err);
    res.status(500).json({ message: "Erro ao remover aviso." });
  }
});

// Rota para salvar o diário de presença
app.post("/api/diario", async (req, res) => {
  const { turmaId, presencas } = req.body;

  try {
    const diario = await prisma.diario.create({
      data: {
        turmaId,
        presencas: {
          create: presencas.map((presenca) => ({
            alunoId: presenca.alunoId,
            status: presenca.status, // Presença ou Falta
            userId: req.userId, // Usuário logado
          })),
        },
      },
    });

    res.status(201).json({
      message: "Diário de presença salvo com sucesso!",
      diario,
    });
  } catch (err) {
    console.error("Erro ao salvar diário de presença:", err);
    res.status(500).json({ message: "Erro ao salvar diário." });
  }
});

// GET /api/diario?turmaId=1&data=2025-04-04
app.get("/api/diarios", async (req, res) => {
  const { data } = req.query;

  try {
    const diarios = await prisma.diario.findMany({
      where: {
        userId: req.userId,
        ...(data && { data: new Date(data) }),
      },
      include: {
        user: true, // você pode incluir o usuário se quiser
      },
      orderBy: {
        data: "desc",
      },
    });

    res.status(200).json(diarios);
  } catch (err) {
    console.error("Erro ao buscar diários:", err);
    res.status(500).json({ message: "Erro ao buscar diários." });
  }
});

// Rota para criar a turma
// No backend
app.post("/api/turmas", async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const turma = await prisma.turma.create({
      data: { nome, descricao },
    });

    res.status(201).json(turma);
  } catch (error) {
    console.error("Erro ao criar turma:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota para associar usuários a uma turma
// app.post("/api/turmas/:turmaId/usuarios", async (req, res) => {
//   const userId = req.body.userId; // ID do usuário a ser adicionado
//   const turmaId = req.params.turmaId; // ID da turma

//   // Verificar se o usuário existe
//   const userExists = await prisma.user.findUnique({
//     where: { id: Number(userId) },
//   });

//   if (!userExists) {
//     return res.status(404).send({ error: "Usuário não encontrado." });
//   }

//   // Verificar se a turma existe
//   const turmaExists = await prisma.turma.findUnique({
//     where: { id: Number(turmaId) },
//   });

//   if (!turmaExists) {
//     return res.status(404).send({ error: "Turma não encontrada." });
//   }

//   try {
//     // Busca turmaUsuario com turmaId: turmaId

//     // Se não encontrar, Criar uma nova turmaUsuario com userId=userId e turmaId=turmaId

//     // Tentar adicionar o usuário à turma
//     await prisma.turma.update({
//       where: { id: Number(turmaId) },
//       data: {
//         usuarios: {
//           connect: { id: Number(userId) }, // Conecta o usuário à turma
//         },
//       },
//     });

//     // Resposta de sucesso
//     res.status(200).send("Usuário adicionado à turma com sucesso!");
//   } catch (error) {
//     // Erro ao adicionar usuário
//     console.error("Erro ao adicionar usuário à turma:", error);
//     res.status(500).send({ error: "Erro ao adicionar usuário à turma." });
//     throw error;
//   }
// });

app.post("/api/turmas/:turmaId/usuarios", async (req, res) => {
  const userId = Number(req.body.userId);
  const turmaId = Number(req.params.turmaId);

  try {
    // Verificar se o usuário e a turma existem
    const [userExists, turmaExists] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.turma.findUnique({ where: { id: turmaId } }),
    ]);

    if (!userExists)
      return res.status(404).send({ error: "Usuário não encontrado." });
    if (!turmaExists)
      return res.status(404).send({ error: "Turma não encontrada." });

    // Associar o usuário à turma
    await prisma.turma.update({
      where: { id: turmaId },
      data: {
        usuarios: {
          connect: { id: userId },
        },
      },
    });

    res.status(200).send("Usuário adicionado à turma com sucesso!");
  } catch (error) {
    console.error("Erro ao adicionar usuário à turma:", error);
    res.status(500).send({ error: "Erro ao adicionar usuário à turma." });
  }
});

// Rota para listar as turmas
app.get("/api/turmas", async (req, res) => {
  try {
    const turmas = await prisma.turma.findMany();
    res.json(turmas); // Garantindo que a resposta seja JSON
  } catch (error) {
    console.error("Erro ao buscar turmas:", error);
    res.status(500).json({ error: "Erro ao buscar turmas" });
  }
});

// Buscar todas as atividades
const atividades = await prisma.atividade.findMany();

// Buscar todos os avisos
const avisos = await prisma.aviso.findMany();

// Buscar todas as avaliações
const avaliacoes = await prisma.avaliacao.findMany();

// Buscar todos os diários
const diarios = await prisma.diario.findMany();

app.post("/api/turmas/:turmaId/presencas", async (req, res) => {
  const { presencas } = req.body;

  if (!presencas || presencas.length === 0) {
    return res.status(400).json({ error: "Lista de presenças vazia." });
  }

  try {
    const created = await prisma.presenca.createMany({
      data: presencas.map((p) => ({
        alunoId: p.alunoId,
        status: p.status,
        data: new Date(p.data),
        materia: p.materia,
        userId: p.userId,
        turmaId: parseInt(req.params.turmaId, 10),
      })),
    });

    res.status(201).json({ message: "Presenças registradas!", created });
  } catch (error) {
    console.error("Erro ao registrar presenças:", error);
    res.status(500).json({ error: "Erro ao registrar presenças." });
  }
});

app.get("/api/turmas/:turmaId/usuarios", async (req, res) => {
  const turmaId = parseInt(req.params.turmaId);

  try {
    const turmaUsuarios = await prisma.turmaUsuario.findMany({
      where: { turmaId: turmaId },
      include: { user: true }, // Inclui os dados do usuário
    });
    res.json(turmaUsuarios.map((turmaUsuario) => turmaUsuario.user)); // Retorna os usuários da turma
  } catch (error) {
    console.error("Erro ao buscar usuários da turma:", error);
    res.status(500).json({ message: "Erro ao buscar usuários da turma" });
  }
});

app.get("/api/turmas/:turmaId/presencas", async (req, res) => {
  const turmaId = Number(req.params.turmaId);

  try {
    const presencas = await prisma.presenca.findMany({
      where: { turmaId: turmaId },
    });

    if (!presencas) {
      return res.status(404).send({ error: "Nenhuma presença encontrada." });
    }

    res.status(200).json(presencas);
  } catch (error) {
    console.error("Erro ao buscar presenças:", error);
    res.status(500).send({ error: "Erro ao buscar presenças." });
  }
});

app.post("/api/chat/criar", async (req, res) => {
  const { titulo, participantes } = req.body; // participantes = [id1, id2]

  if (!participantes || participantes.length < 2) {
    return res.status(400).json({ erro: "Informe pelo menos 2 usuários" });
  }

  try {
    const novoChat = await prisma.chat.create({
      data: {
        titulo,
        participantes: {
          create: participantes.map((id) => ({ userId: id })),
        },
      },
      include: {
        participantes: { include: { user: true } },
      },
    });

    res.json(novoChat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao criar chat" });
  }
});

// 🔹 Buscar todos os chats que o usuário participa
app.get("/api/chat/usuario/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);

  try {
    const chats = await prisma.chat.findMany({
      where: {
        participantes: {
          some: { userId },
        },
      },
      include: {
        participantes: {
          include: { user: true },
        },
        mensagens: {
          orderBy: { data: "desc" },
          take: 1,
          include: { remetente: true },
        },
      },
    });

    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao buscar chats" });
  }
});

// 🔹 Buscar mensagens de um chat
app.get("/api/chat/mensagens/:chatId", async (req, res) => {
  const chatId = parseInt(req.params.chatId);

  try {
    const mensagens = await prisma.mensagem.findMany({
      where: { chatId },
      orderBy: { data: "asc" },
      include: {
        remetente: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    res.json(mensagens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao buscar mensagens" });
  }
});

// 🔹 Enviar nova mensagem
app.post("/api/chat/mensagens", async (req, res) => {
  const { chatId, remetenteId, texto } = req.body;

  if (!chatId || !remetenteId || !texto) {
    return res.status(400).json({ erro: "Faltando dados obrigatórios" });
  }

  try {
    const novaMensagem = await prisma.mensagem.create({
      data: {
        texto,
        chatId,
        remetenteId,
      },
      include: {
        remetente: true,
      },
    });

    res.json(novaMensagem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao enviar mensagem" });
  }
});

app.get("/api/chat/usuarios", async (req, res) => {
  const { tipo } = req.query;

  try {
    const usuarios = await prisma.user.findMany({
      where: tipo ? { role: tipo } : {}, // ← todos os usuários se tipo for vazio
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
});
app.get("/api/chat/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Buscar chats onde o usuário participa
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: parseInt(userId), // ou outro campo para filtrar os chats do usuário
          },
        },
      },
      include: {
        messages: true, // Incluir mensagens associadas a cada chat
        participants: true, // Incluir participantes do chat
      },
    });

    if (!chats || chats.length === 0) {
      return res.status(404).json({ message: "Nenhuma conversa encontrada." });
    }

    res.status(200).json(chats);
  } catch (err) {
    console.error("Erro ao buscar conversas:", err);
    res.status(500).json({ message: "Erro ao buscar conversas." });
  }
});

app.post("/api/chat/conectar", async (req, res) => {
  const { user1, user2 } = req.body;

  console.log("Usuários recebidos para o chat:", { user1, user2 });

  if (!user1 || !user2) {
    return res.status(400).json({ erro: "IDs de usuários são obrigatórios" });
  }

  try {
    let chats = await prisma.chat.findMany({
      where: {
        participantes: {
          some: { userId: user1 },
        },
      },
      include: {
        participantes: true,
      },
    });

    let chat = chats.find((c) => {
      const ids = c.participantes.map((p) => p.userId);
      return ids.includes(user1) && ids.includes(user2) && ids.length === 2;
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          participantes: {
            create: [
              { user: { connect: { id: user1 } } },
              { user: { connect: { id: user2 } } },
            ],
          },
        },
        include: {
          participantes: true, // Corrigido aqui!
        },
      });
    }

    res.json({ chatId: chat.id });
  } catch (error) {
    console.error("Erro ao conectar chat:", error);
    res.status(500).json({ erro: "Erro interno" });
  }
});

app.get("/api/usuario/me", async (req, res) => {
  // Exemplo simples, substitua por autenticação real depois
  const email = req.headers["x-user-email"]; // ou use JWT/autenticação real
  if (!email) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const usuario = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      nome: true,
      email: true,
      _vall: true,
    },
  });

  if (!usuario) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  res.json(usuario);
});

app.get("/chat/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: parseInt(id) },
      include: {
        mensagens: {
          include: {
            remetente: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    res.json({
      chat: { id: chat.id, titulo: chat.titulo },
      mensagens: chat.mensagens,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.get("/api/horarios", async (req, res) => {
  const horarios = await prisma.horario.findMany();
  res.json(horarios);
});

app.post("/api/horarios", async (req, res) => {
  const { dia, turno, atividade, horaInicio, horaFim } = req.body;
  const novoHorario = await prisma.horario.create({
    data: { dia, turno, atividade, horaInicio, horaFim },
  });
  res.json(novoHorario);
});

app.delete("/api/horarios/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const apagado = await prisma.horario.delete({
      where: { id },
    });
    res.json({ success: true, apagado });
  } catch (error) {
    res
      .status(404)
      .json({ success: false, message: "Horário não encontrado." });
  }
});

// PUT /api/horarios/:id
app.put("/api/horarios/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { dia, turno, atividade, horaInicio, horaFim } = req.body;
  try {
    const atualizado = await prisma.horario.update({
      where: { id },
      data: { dia, turno, atividade, horaInicio, horaFim },
    });
    res.json({ success: true, atualizado });
  } catch (error) {
    res
      .status(404)
      .json({ success: false, message: "Erro ao atualizar horário." });
  }
});

app.post("/api/aluno", async (req, res) => {
  const {
    name,
    email,
    password,
    cpf,
    telefone,
    dataNascimento,
    cpfMae,
    cpfPai,
  } = req.body;

  if (
    !name ||
    !email ||
    !password ||
    !cpf ||
    !telefone ||
    !dataNascimento ||
    !cpfMae ||
    !cpfPai
  ) {
    return res
      .status(400)
      .json({ message: "Preencha todos os campos obrigatórios." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const novoAluno = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "aluno",
        aluno: {
          create: {
            nome: name,
            cpf,
            telefone,
            dataNascimento: new Date(dataNascimento),
            email,
            cpfMae,
            cpfPai,
            senha: hashedPassword,
          },
        },
      },
    });

    res
      .status(201)
      .json({ message: "Aluno cadastrado com sucesso", aluno: novoAluno });
  } catch (error) {
    console.error("Erro ao cadastrar aluno:", error);
    res.status(500).json({ message: "Erro ao cadastrar aluno." });
  }
});
app.post("/api/prof", async (req, res) => {
  const { name, email, password, cpf, telefone, dataNascimento, matricula } =
    req.body;

  if (
    !name ||
    !email ||
    !password ||
    !cpf ||
    !telefone ||
    !dataNascimento ||
    !matricula
  ) {
    return res
      .status(400)
      .json({ message: "Preencha todos os campos obrigatórios." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const novoProf = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "professor",
        professor: {
          create: {
            name,
            cpf,
            telefone,
            dataNascimento: new Date(dataNascimento),
            email,
            matricula,
            password: hashedPassword,
          },
        },
      },
    });

    res
      .status(201)
      .json({ message: "Professor cadastrado com sucesso", prof: novoProf });
  } catch (error) {
    console.error("Erro ao cadastrar Professor:", error);
    res.status(500).json({ message: "Erro ao cadastrar professor." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}!🚀`);
});
