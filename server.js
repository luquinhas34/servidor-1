import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import auth from "./middlewares/auth.js";
import multer from "multer";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(cors({ origin: "*" }));

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
app.get("/api/atividades", auth, async (req, res) => {
  try {
    const atividades = await prisma.atividade.findMany({
      where: { userId: req.userId },
    });
    res.status(200).json(atividades);
  } catch (err) {
    console.error("Erro ao buscar atividades:", err);
    res.status(500).json({ message: "Erro ao buscar atividades." });
  }
});
app.post(
  "/api/atividades",
  auth,
  upload.single("documento"),
  async (req, res) => {
    try {
      const { titulo, descricao, dataInicio, dataFim, turmaId, userId } =
        req.body;

      if (!titulo || !descricao || !turmaId || !userId) {
        return res
          .status(400)
          .json({ message: "Campos obrigatórios ausentes!" });
      }

      const userExists = await prisma.user.findUnique({
        where: { id: parseInt(userId, 10) },
      });

      if (!userExists) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      const atividade = await prisma.atividade.create({
        data: {
          titulo,
          descricao,
          dataInicio: new Date(dataInicio),
          dataFim: new Date(dataFim),
          turma: { connect: { id: turmaId } },
          documento: req.file ? req.file.buffer : null,
          user: { connect: { id: parseInt(userId, 10) } },
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
app.post("/api/avaliacoes", async (req, res) => {
  const { titulo, descricao, dataInicio, dataFim, turmaId, userId } = req.body;

  if (!titulo || !descricao || !dataInicio || !dataFim || !turmaId || !userId) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  // Verifica se a turma e o usuário existem
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  const usuario = await prisma.user.findUnique({ where: { id: userId } });

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
        turmaId,
        userId,
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
  console.log(req.body); // Adicione este log para verificar o que está sendo enviado.

  const { presencas } = req.body;

  if (!presencas || presencas.length === 0) {
    return res
      .status(400)
      .json({ error: "Dados inválidos. Verifique nome, matéria e userId." });
  }

  try {
    presencas.forEach((presenca) => {
      if (
        !presenca.alunoId ||
        !presenca.status ||
        !presenca.data ||
        !presenca.materia ||
        !presenca.userId
      ) {
        return res
          .status(400)
          .json({ error: "Faltam dados obrigatórios em uma das presenças." });
      }
    });

    // Inserir a lógica de criação das presenças no banco
    res.status(200).json({ message: "Presenças registradas com sucesso!" });
  } catch (error) {
    console.error("Erro ao registrar presenças:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}!🚀`);
});
