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
async function inicializarDados() {
  try {
    // --- Criar turmas se não existirem ---
    const turmasExistentes = await prisma.turma.findMany();
    if (turmasExistentes.length === 0) {
      await prisma.turma.createMany({
        data: [
          { nome: "1º Ano A" },
          { nome: "1º Ano B" },
          { nome: "2º Ano A" },
          { nome: "2º Ano B" },
        ],
      });
      //localhost:3000/api/turmas/aluno/8ttp://localhost:3000/api/turmas/aluno/8
      ttp: console.log("Turmas criadas com sucesso!");
    } else {
      console.log("Turmas já existem.");
    }

    // --- Criar matérias se não existirem ---
    const materiasExistentes = await prisma.materia.findMany();
    if (materiasExistentes.length === 0) {
      await prisma.materia.createMany({
        data: [
          { nome: "Matemática" },
          { nome: "Português" },
          { nome: "Ciências" },
          { nome: "História" },
          { nome: "Geografia" },
          { nome: "Inglês" },
          { nome: "Educação Física" },
        ],
      });
      console.log("Matérias criadas com sucesso!");
    } else {
      console.log("Matérias já existem.");
    }
  } catch (err) {
    console.error("Erro ao inicializar dados:", err);
  }
}

// Chamar função de inicialização depois que o Prisma estiver conectado
inicializarDados();

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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    // 1. Encontrar o usuário no banco
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // 2. Verificar a senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Senha inválida." });
    }

    // ======================================================================
    //     AQUI ESTÁ A CORREÇÃO QUE VOCÊ PRECISA
    // ======================================================================

    let turmaIdt = null; // Inicia como nulo

    // 3. Se o usuário for um aluno, buscar o ID da sua turma
    if (user.role === "aluno_vall") {
      // Busca a primeira turma associada a este usuário
      const relacaoTurma = await prisma.turmaUsuario.findFirst({
        where: { userId: user.id },
        select: { turmaIdt: true }, // Só precisamos do ID da turma
      });

      if (relacaoTurma) {
        turmaIdt = relacaoTurma.turmaIdt;
      }
    }

    // 4. Montar o objeto do usuário (o "payload") para o front-end
    // Este é o objeto que será salvo no localStorage como 'user'
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      turmaIdt: turmaIdt, // <--- A INFORMAÇÃO DA TURMA ESTÁ AQUI
    };

    // ======================================================================
    //     FIM DA CORREÇÃO
    // ======================================================================

    // 5. Gerar o Token JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET, // Crie esta variável no seu .env
      { expiresIn: "8h" }
    );

    // 6. Enviar a resposta completa para o front-end
    res.status(200).json({ token, user: userPayload });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
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
//
//
//
//
//
//
//
// TUDO SOBRE ATIVIDADES
// Rota de busca de atividades
app.post("/api/atividades", upload.single("documento"), async (req, res) => {
  const { titulo, descricao, dataInicio, dataFim, turmaIdt, userId } = req.body;

  // Converte para número
  const turmaIdtNum = Number(turmaIdt);
  const userIdNum = Number(userId);

  if (!titulo || !descricao || !dataInicio || !dataFim || isNaN(turmaIdtNum)) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  const turma = await prisma.turma.findUnique({ where: { idt: turmaIdtNum } });
  const usuario = await prisma.user.findUnique({ where: { id: userIdNum } });

  if (!turma || !usuario) {
    return res
      .status(404)
      .json({ message: "Turma ou usuário não encontrados." });
  }

  try {
    const atividade = await prisma.atividade.create({
      data: {
        titulo,
        descricao,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        turmaIdt: Number(turmaIdtNum),
        userId: userIdNum,
      },
    });
    return res.status(201).json(atividade);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao criar atividade." });
  }
});
// CÓDIGO CORRIGIDO (FILTRA SE O ?turmaId EXISTIR)
app.get("/api/atividades", async (req, res) => {
  // 1. Pega o 'turmaId' da URL (ex: /api/atividades?turmaId=11)
  const { turmaId } = req.query;

  // 2. Prepara o objeto 'where' para o Prisma
  const whereClause = {};

  // 3. Se um 'turmaId' foi enviado, adiciona ele ao filtro
  //    (Lembre-se de converter para Número, pois 'req.query' é sempre string)
  if (turmaId) {
    whereClause.turmaIdt = Number(turmaId);
  }

  // Se 'turmaId' não for enviado (como o Coordenador faz),
  // 'whereClause' ficará vazio, e o Prisma buscará TUDO.

  try {
    const atividades = await prisma.atividade.findMany({
      where: whereClause, // <--- A MÁGICA ACONTECE AQUI
      orderBy: {
        dataInicio: "desc", // Opcional: ordenar da mais nova para a mais antiga
      },
    });

    res.json(atividades);
  } catch (error) {
    console.error("Erro ao buscar atividades:", error);
    res.status(500).json({ message: "Erro ao buscar atividades." });
  }
});
// Rota de deletação de atividade
app.delete("/api/atividades/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se a atividades existe
    const atividadeExistente = await prisma.atividade.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!atividadeExistente) {
      return res.status(404).json({ message: "atividade não encontrada." });
    }

    // Deleta a atividade
    await prisma.atividade.delete({ where: { id: parseInt(id, 10) } });

    // Resposta de sucesso
    res.status(200).json({ message: "atividade removida com sucesso!" });
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
          message: "Pelo menos um  deve ser fornecido para atualização.",
        });
      }

      const atividadeExistente = await prisma.atividade.findUnique({
        where: { id: parseInt(id, 10) },
      });
      if (!atividadeExistente) {
        return res.status(404).json({ message: "atividade não encontrada." });
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
        message: "atividade atualizada com sucesso!",
        atividade: atividadeAtualizada,
      });
    } catch (err) {
      console.error("Erro ao atualizar atividade:", err);
      res.status(500).json({ message: "Erro ao atualizar atividade." });
    }
  }
);
//
//
//
//
//
//
//
// TUDO SOBRE AVALIAÇÕES
// Rota de criação de avaliações
app.post("/api/avaliacoes", upload.single("documento"), async (req, res) => {
  const { titulo, descricao, dataInicio, dataFim, turmaIdt, userId } = req.body;

  const turmaIdtNum = Number(turmaIdt);
  const userIdNum = Number(userId);

  if (
    !titulo ||
    !descricao ||
    !dataInicio ||
    !dataFim ||
    isNaN(turmaIdtNum) ||
    isNaN(userIdNum)
  ) {
    return res
      .status(400)
      .json({ error: "Todos os campos são obrigatórios e válidos." });
  }

  const turma = await prisma.turma.findUnique({ where: { idt: turmaIdtNum } });
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
        turmaIdt: turmaIdtNum,
        userId: userIdNum,
        documento: req.file?.filename || null, // salvar nome do arquivo se enviado
      },
    });
    return res
      .status(201)
      .json({ message: "Avaliação criada com sucesso!", avaliacao });
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
    return res.status(500).json({ message: "Erro ao criar avaliação." });
  }
});
// No seu servidor back-end (ex: server.js)
// NO SEU BACK-END (server.js)
// (Substitua sua rota GET /api/avaliacoes antiga por esta)

app.get("/api/avaliacoes", async (req, res) => {
  // 1. Pega o 'turmaId' da URL (ex: /api/avaliacoes?turmaId=11)
  const { turmaId } = req.query;

  // 2. Prepara o objeto 'where' para o Prisma
  const whereClause = {};

  // 3. Se um 'turmaId' foi enviado, adiciona ele ao filtro
  if (turmaId) {
    whereClause.turmaIdt = Number(turmaId);
  }

  // Se 'turmaId' não for enviado (como o Professor/Coord. faz),
  // 'whereClause' ficará vazio, e o Prisma buscará TUDO.

  try {
    // ATENÇÃO: Verifique se o seu modelo no Prisma se chama 'avaliacao'
    // (pode ser 'avaliacoe' ou 'Avaliacao')
    const avaliacoes = await prisma.avaliacao.findMany({
      where: whereClause, // <--- O FILTRO REAL ACONTECE AQUI
      orderBy: {
        dataInicio: "desc",
      },
    });

    res.json(avaliacoes);
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
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
//
//
//
//
//
//
// TUDO SOBRE TURMAS
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
app.post("/api/turmas/adicionar-aluno", async (req, res) => {
  const { userId, turmaIdt } = req.body;

  if (!userId || !turmaIdt) {
    return res
      .status(400)
      .json({ message: "userId e turmaIdt são obrigatórios." });
  }

  try {
    const turma = await prisma.turma.findUnique({
      where: { idt: Number(turmaIdt) },
    });
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!turma || !user) {
      return res
        .status(404)
        .json({ message: "Usuário ou turma não encontrados." });
    }

    // Verifica se já está cadastrado
    const jaExiste = await prisma.turmaUsuario.findFirst({
      where: {
        turmaIdt: Number(turmaIdt),
        userId: Number(userId),
      },
    });

    if (jaExiste) {
      return res.status(400).json({ message: "Usuário já está na turma." });
    }

    const relacao = await prisma.turmaUsuario.create({
      data: {
        turmaIdt: Number(turmaIdt),
        userId: Number(userId),
      },
    });

    return res
      .status(201)
      .json({ message: "Aluno adicionado com sucesso!", relacao });
  } catch (error) {
    console.error("Erro ao adicionar aluno à turma:", error);
    return res
      .status(500)
      .json({ message: "Erro ao adicionar aluno à turma." });
  }
});

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
app.get("/api/chamadas/:turmaIdt", async (req, res) => {
  const turmaIdt = Number(req.params.turmaIdt);

  if (isNaN(turmaIdt)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  try {
    const chamadas = await prisma.chamadas.findMany({
      where: { turmaIdt },
      orderBy: { data: "desc" },
      select: {
        id: true,
        data: true,
        nome: true,
        materia: true,
        user: { select: { id: true, name: true } },
      },
    });
    res.status(200).json(chamadas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar chamadas." });
  }
});
app.post("/api/chamadas", async (req, res) => {
  console.log("Recebido no /api/chamadas:", req.body);

  let { turmaIdt, userId, data, nome, materia, presencas } = req.body;

  // Conversões e validações básicas
  turmaIdt = Number(turmaIdt);
  userId = Number(userId);

  if (isNaN(turmaIdt))
    return res.status(400).json({ message: "turmaIdt inválido" });
  if (isNaN(userId))
    return res.status(400).json({ message: "userId inválido" });
  if (!data) return res.status(400).json({ message: "Falta campo data" });
  if (!nome || nome.trim() === "")
    return res.status(400).json({ message: "Falta campo nome" });
  if (!Array.isArray(presencas))
    return res
      .status(400)
      .json({ message: "Campo presencas deve ser um array" });

  try {
    const dataFormatada = new Date(data);

    // Procura chamada no mesmo dia e turma
    let chamada = await prisma.chamadas.findFirst({
      where: {
        turmaIdt,
        data: dataFormatada,
      },
    });

    if (chamada) {
      // Deleta presenças antigas para atualizar
      await prisma.presenca.deleteMany({
        where: { chamadaId: chamada.id },
      });
    } else {
      // Cria nova chamada
      chamada = await prisma.chamadas.create({
        data: {
          turmaIdt,
          userId,
          data: dataFormatada,
          nome: nome.trim(),
          materia: materia ? materia.trim() : null,
        },
      });
    }

    // Mapeia presenças para salvar no banco
    const presencasData = presencas.map((p) => ({
      alunoId: Number(p.alunoId),
      chamadaId: chamada.id,
      turmaIdt,
      status: p.presente ? "PRESENCA" : "FALTA",
    }));

    await prisma.presenca.createMany({ data: presencasData });

    return res.status(201).json({ message: "Chamada salva com sucesso." });
  } catch (error) {
    console.error("Erro no POST /api/chamadas:", error);
    return res.status(500).json({ message: "Erro interno ao salvar chamada." });
  }
});

// GET /api/presencas?turmaIdt=1&data=2025-07-17
app.get("/api/presencas", async (req, res) => {
  const { turmaIdt, data } = req.query;

  if (!turmaIdt || !data) {
    return res
      .status(400)
      .json({ message: "Parâmetros turmaIdt e data são obrigatórios." });
  }

  try {
    const chamada = await prisma.chamadas.findFirst({
      where: {
        turmaIdt: Number(turmaIdt),
        data: new Date(data),
      },
    });

    if (!chamada) {
      return res.status(200).json([]);
    }

    const presencas = await prisma.presenca.findMany({
      where: { chamadaId: chamada.id },
    });

    res.status(200).json(presencas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar presenças." });
  }
});

app.get("/api/frequencia/turma/:idt", async (req, res) => {
  const turmaIdt = parseInt(req.params.idt);
  const mes = req.query.mes; // opcional: ex: "07"

  try {
    // Buscar alunos da turma
    const turmaUsuarios = await prisma.turmaUsuario.findMany({
      where: { turmaIdt },
      include: { user: true },
    });

    const alunos = turmaUsuarios.map((tu) => tu.user);

    // Buscar presenças do tipo FALTA, por aluno
    const faltasPorAluno = await Promise.all(
      alunos.map(async (aluno) => {
        const where = {
          alunoId: aluno.id,
          turmaIdt,
          status: "FALTA",
        };

        if (mes) {
          // Filtrar pelas chamadas com data dentro do mês
          const chamadasNoMes = await prisma.chamadas.findMany({
            where: {
              turmaIdt,
              data: {
                gte: new Date(`2025-${mes}-01T00:00:00.000Z`),
                lt: new Date(`2025-${mes}-31T23:59:59.999Z`),
              },
            },
            select: { id: true },
          });

          const chamadasIds = chamadasNoMes.map((c) => c.id);
          where.chamadaId = { in: chamadasIds };
        }

        const faltas = await prisma.presenca.count({ where });

        return {
          nome: aluno.name,
          faltas,
        };
      })
    );

    res.json(faltasPorAluno);
  } catch (error) {
    console.error("Erro ao buscar frequência:", error);
    res.status(500).json({ error: "Erro ao buscar frequência da turma." });
  }
});
// Rota para salvar o diário de presença
app.post("/api/diario", async (req, res) => {
  const { turmaIdt, presencas } = req.body;

  try {
    const diario = await prisma.diario.create({
      data: {
        turmaIdt,
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

// GET /api/diario?turmaIdt=1&data=2025-04-04
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

app.post("/api/turmas/:turmaIdt/usuarios", async (req, res) => {
  const userId = Number(req.body.userId);
  const turmaIdt = Number(req.params.turmaIdt);

  try {
    // Verificar se o usuário e a turma existem
    const [userExists, turmaExists] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.turma.findUnique({ where: { id: turmaIdt } }),
    ]);

    if (!userExists)
      return res.status(404).send({ error: "Usuário não encontrado." });
    if (!turmaExists)
      return res.status(404).send({ error: "Turma não encontrada." });

    // Associar o usuário à turma
    await prisma.turma.update({
      where: { id: turmaIdt },
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

app.post("/api/turmas/:turmaIdt/presencas", async (req, res) => {
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
        turmaIdt: parseInt(req.params.turmaIdt, 10),
      })),
    });

    res.status(201).json({ message: "Presenças registradas!", created });
  } catch (error) {
    console.error("Erro ao registrar presenças:", error);
    res.status(500).json({ error: "Erro ao registrar presenças." });
  }
});

app.get("/api/turmas/:turmaIdt/usuarios", async (req, res) => {
  const turmaIdt = parseInt(req.params.turmaIdt);

  try {
    const turmaUsuarios = await prisma.turmaUsuario.findMany({
      where: { turmaIdt: turmaIdt },
      include: { user: true }, // Inclui os dados do usuário
    });
    res.json(turmaUsuarios.map((turmaUsuario) => turmaUsuario.user)); // Retorna os usuários da turma
  } catch (error) {
    console.error("Erro ao buscar usuários da turma:", error);
    res.status(500).json({ message: "Erro ao buscar usuários da turma" });
  }
});

app.get("/api/turmas/:turmaIdt/presencas", async (req, res) => {
  const turmaIdt = Number(req.params.turmaIdt);

  try {
    const presencas = await prisma.presenca.findMany({
      where: { turmaIdt: turmaIdt },
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
        role: "aluno_vall",
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

app.post("/api/turmas/adicionar-aluno", async (req, res) => {
  const { userId, turmaIdt } = req.body;

  if (!userId || !turmaIdt) {
    return res
      .status(400)
      .json({ message: "userId e turmaIdt são obrigatórios." });
  }

  const userIdNum = Number(userId);
  const turmaIdtNum = Number(turmaIdt);

  try {
    const turma = await prisma.turma.findUnique({
      where: { idt: turmaIdtNum },
    });
    const usuario = await prisma.user.findUnique({ where: { id: userIdNum } });

    if (!turma || !usuario) {
      return res
        .status(404)
        .json({ message: "Usuário ou turma não encontrados." });
    }

    // Verifica se já está na turma
    const relacaoExistente = await prisma.turmaUsuario.findUnique({
      where: {
        turmaIdt_userId: {
          turmaIdt: turmaIdtNum,
          userId: userIdNum,
        },
      },
    });

    if (relacaoExistente) {
      return res.status(200).json({ message: "Usuário já está na turma." });
    }

    // Cria a relação
    const relacao = await prisma.turmaUsuario.create({
      data: {
        turmaIdt: turmaIdtNum,
        userId: userIdNum,
      },
    });

    return res
      .status(201)
      .json({ message: "Aluno adicionado com sucesso!", relacao });
  } catch (error) {
    console.error("Erro ao adicionar aluno à turma:", error);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
});
app.get("/api/turmas/:idt/alunos", async (req, res) => {
  const idt = Number(req.params.idt);

  if (isNaN(idt)) {
    return res.status(400).json({ message: "IDT inválido" });
  }

  try {
    const alunosDaTurma = await prisma.turmaUsuario.findMany({
      where: { turmaIdt: idt },
      include: {
        user: true,
      },
    });

    // Filtra manualmente os alunos com role "aluno"
    const alunos = alunosDaTurma
      .filter((tu) => tu.user.role === "aluno_vall")
      .map((tu) => ({
        id: tu.user.id,
        nome: tu.user.name,
        email: tu.user.email,
      }));

    res.status(200).json(alunos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar alunos da turma." });
  }
});
app.delete("/api/turmas/:turmaIdt/alunos/:userId", async (req, res) => {
  const turmaIdt = Number(req.params.turmaIdt);
  const userId = Number(req.params.userId);

  try {
    await prisma.turmaUsuario.deleteMany({
      where: {
        turmaIdt,
        userId,
      },
    });

    res.status(200).json({ message: "Aluno removido da turma com sucesso." });
  } catch (error) {
    console.error("Erro ao remover aluno:", error);
    res.status(500).json({ message: "Erro ao remover aluno da turma." });
  }
});
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ message: "Erro ao buscar usuários." });
  }
});

// Rotas horario
// POST /api/horarios/multiplos
app.post("/api/horarios/multiplos", async (req, res) => {
  try {
    const horarios = req.body; // espera um array de objetos {dia, turno, atividade, horaInicio, horaFim, turmaId}

    // Validação básica
    if (!Array.isArray(horarios) || horarios.length === 0) {
      return res
        .status(400)
        .json({ error: "Envie um array de horários válido" });
    }

    for (const h of horarios) {
      if (
        !h.dia ||
        !h.turno ||
        !h.atividade ||
        !h.horaInicio ||
        !h.horaFim ||
        !h.turmaId
      ) {
        return res
          .status(400)
          .json({ error: "Todos os campos devem ser preenchidos" });
      }
    }

    // Criação múltipla usando createMany
    const created = await prisma.horario.createMany({
      data: horarios.map((h) => ({
        dia: h.dia,
        turno: h.turno,
        atividade: h.atividade,
        horaInicio: h.horaInicio,
        horaFim: h.horaFim,
        turmaId: Number(h.turmaId),
      })),
      skipDuplicates: true, // evita duplicados se necessário
    });

    res.json({ message: `${created.count} horários adicionados com sucesso!` });
  } catch (err) {
    console.error("Erro ao adicionar múltiplos horários:", err);
    res.status(500).json({ error: "Erro ao adicionar horários" });
  }
});

// -------------------- ROTAS HORÁRIO --------------------

app.get("/health", (req, res) => res.json({ ok: true }));

// --- GET /api/turmas
app.get("/api/turmas", async (req, res) => {
  try {
    // Seu modelo Turma usa idt como PK
    const turmas = await prisma.turma.findMany({
      select: {
        idt: true,
        nome: true,
      },
      orderBy: { nome: "asc" },
    });

    // O frontend espera {id, nome}? Seu select traz idt. Normalizamos para id.
    const resultado = turmas.map((t) => ({ id: t.idt, nome: t.nome }));
    res.json(resultado);
  } catch (error) {
    console.error("Erro GET /api/turmas:", error);
    res.status(500).json({ error: "Erro ao buscar turmas" });
  }
});

// --- GET /api/materia/listar
app.get("/api/materia/listar", async (req, res) => {
  try {
    const materias = await prisma.materia.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });
    res.json(materias);
  } catch (error) {
    console.error("Erro GET /api/materia/listar:", error);
    res.status(500).json({ error: "Erro ao buscar matérias" });
  }
});

// --- POST /api/horario/multiplos
// Espera um array com objetos: { dia, turno, horaInicio, horaFim, turmaId, materiaId }
app.post("/api/horario/multiplos", async (req, res) => {
  const payload = req.body;

  if (!Array.isArray(payload) || payload.length === 0) {
    return res
      .status(400)
      .json({ error: "Payload deve ser um array de horários" });
  }

  // validação básica dos campos
  for (let i = 0; i < payload.length; i++) {
    const h = payload[i];
    if (!h.dia || !h.turno || !h.horaInicio || !h.horaFim || !h.turmaId) {
      return res.status(400).json({
        error: `Item ${i} inválido. Campos obrigatórios: dia, turno, horaInicio, horaFim, turmaId`,
      });
    }
  }

  try {
    // checar se a turma existe (usando idt)
    const turmaId = payload[0].turmaId;
    const turma = await prisma.turma.findUnique({ where: { idt: turmaId } });
    if (!turma) {
      return res
        .status(400)
        .json({ error: `Turma com idt=${turmaId} não encontrada` });
    }

    // opcional: verificar matérias referenciadas (se forem não nulas)
    const materiaIds = Array.from(
      new Set(
        payload
          .map((p) => (p.materiaId ? Number(p.materiaId) : null))
          .filter(Boolean)
      )
    );
    if (materiaIds.length > 0) {
      const materiasExistentes = await prisma.materia.findMany({
        where: { id: { in: materiaIds } },
        select: { id: true },
      });
      const existentesSet = new Set(materiasExistentes.map((m) => m.id));
      const faltantes = materiaIds.filter((id) => !existentesSet.has(id));
      if (faltantes.length > 0) {
        return res
          .status(400)
          .json({ error: `Matérias não encontradas: ${faltantes.join(", ")}` });
      }
    }

    // Normalizar dados: transformar materiaId null/undefined em null
    const dadosParaCriar = payload.map((p) => ({
      dia: p.dia,
      turno: p.turno,
      horaInicio: p.horaInicio,
      horaFim: p.horaFim,
      turmaId: Number(p.turmaId),
      materiaId: p.materiaId ? Number(p.materiaId) : null,
    }));

    // Usar createMany (se quiser saber quais foram criados, usar create em loop)
    const created = await prisma.horario.createMany({
      data: dadosParaCriar,
      skipDuplicates: true,
    });

    res.json({
      message: "Horários inseridos",
      insertedCount: created.count ?? null,
    });
  } catch (error) {
    console.error("Erro POST /api/horario/multiplos:", error);
    res.status(500).json({ error: "Erro ao inserir horários" });
  }
});
app.get("/api/horarios", async (req, res) => {
  try {
    const horarios = await prisma.horario.findMany({
      include: {
        turma: true,
        materia: true,
      },
      orderBy: { dia: "asc" },
    });
    res.json(horarios);
  } catch (error) {
    console.error("Erro GET /api/horarios:", error);
    res.status(500).json({ error: "Erro ao buscar horários" });
  }
});

// --- GET /api/horarios/turma/:idt
// Lista horários de uma turma específica
app.get("/api/horarios/turma/:idt", async (req, res) => {
  const { idt } = req.params;

  try {
    const horarios = await prisma.horario.findMany({
      where: { turmaId: Number(idt) },
      include: { materia: true },
      orderBy: { dia: "asc" },
    });

    res.json(horarios);
  } catch (error) {
    console.error("Erro GET /api/horarios/turma/:idt:", error);
    res.status(500).json({ error: "Erro ao buscar horários da turma" });
  }
});

// --- GET /api/horarios/:id
// Busca um horário específico por ID
app.get("/api/horarios/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const horario = await prisma.horario.findUnique({
      where: { id: Number(id) },
      include: { turma: true, materia: true },
    });

    if (!horario) {
      return res.status(404).json({ error: "Horário não encontrado" });
    }

    res.json(horario);
  } catch (error) {
    console.error("Erro GET /api/horarios/:id:", error);
    res.status(500).json({ error: "Erro ao buscar horário" });
  }
});

// sqwdwq
// ::::

// GET /api/turmas/aluno/:id
app.get("/aluno/:id", async (req, res) => {
  const alunoId = parseInt(req.params.id);

  if (isNaN(alunoId)) {
    return res.status(400).json({ error: "ID de aluno inválido" });
  }

  try {
    // Busca a turma onde o aluno está
    const turmaAluno = await prisma.turma.findFirst({
      where: {
        usuarios: {
          some: {
            userId: alunoId,
          },
        },
      },
      include: {
        usuarios: true, // opcional, se quiser incluir os alunos
      },
    });

    if (!turmaAluno) {
      return res.status(404).json({ error: "Turma do aluno não encontrada" });
    }

    return res.json(turmaAluno);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar turma do aluno" });
  }
});
app.get("/api/alunos/:id", async (req, res) => {
  try {
    const alunoId = req.params.id;
    const aluno = await Aluno.findByPk(alunoId, {
      include: [{ model: Turma, as: "turma" }], // Assumindo relação Aluno.belongsTo(Turma)
    });
    if (!aluno)
      return res.status(404).json({ message: "Aluno não encontrado." });
    res.json(aluno); // { id: 8, nome: '...', turma: { idt: 1, nome: 'Turma A' } }
  } catch (error) {
    res.status(500).json({ message: "Erro interno." });
  }
});
// OU Fallback: GET /api/turmas/aluno/:id (só turma)
app.get("/api/turmas/aluno/:id", async (req, res) => {
  try {
    const alunoId = req.params.id;
    const aluno = await Aluno.findByPk(alunoId);
    if (!aluno || !aluno.turmaId)
      return res.status(404).json({ message: "Sem turma." });
    const turma = await Turma.findByPk(aluno.turmaId);
    res.json(turma); // { idt: 1, nome: 'Turma A' }
  } catch (error) {
    res.status(500).json({ message: "Erro interno." });
  }
});
// NO SEU BACK-END (ex: server.js)

// --- Rota para CRIAR uma nova Matéria ---
app.post("/api/materia", async (req, res) => {
  const { nome } = req.body; // A rota espera um JSON: { "nome": "Nova Matéria" }

  if (!nome) {
    return res.status(400).json({ message: "O campo 'nome' é obrigatório." });
  }

  try {
    // Verifica se a matéria já existe (opcional, mas recomendado)
    const materiaExistente = await prisma.materia.findUnique({
      where: { nome: nome },
    });

    if (materiaExistente) {
      return res
        .status(409)
        .json({ message: "Uma matéria com esse nome já existe." });
    }

    // Cria a nova matéria no banco de dados
    const novaMateria = await prisma.materia.create({
      data: {
        nome: nome,
      },
    });

    res
      .status(201)
      .json({ message: "Matéria criada com sucesso!", materia: novaMateria });
  } catch (error) {
    console.error("Erro ao criar matéria:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Notas
// --- ROTAS DE NOTAS (CRUD) ---
// (CORRIGIDO PARA O SCHEMA CORRETO)

// 1. (Coord.) LANÇAR UMA NOVA NOTA
app.post("/api/notas", async (req, res) => {
  // O 'turmaId' voltou, pois agora está no schema
  const { userId, materiaId, turmaIdt, tipo, valor } = req.body;

  if (
    userId === undefined ||
    materiaId === undefined ||
    turmaIdt === undefined ||
    tipo === undefined ||
    valor === undefined
  ) {
    return res.status(400).json({
      message:
        "Campos (userId, materiaId, turmaIdt, tipo, valor) são obrigatórios.",
    });
  }

  try {
    const novaNota = await prisma.Nota.create({
      // Nome correto: Nota
      data: {
        tipo: String(tipo),
        valor: parseFloat(valor),
        alunoId: Number(userId), // Nome do campo no schema: alunoId
        materiaId: Number(materiaId),
        turmaIdt: Number(turmaIdt), // Nome do campo no schema: turmaIdt
      },
    });
    res.status(201).json(novaNota);
  } catch (error) {
    console.error("Erro ao criar nota:", error);
    res.status(500).json({ message: "Erro ao cadastrar nota." });
  }
});

// 2. (Coord.) BUSCAR NOTAS (com filtros de turma e matéria)
app.get("/api/notas", async (req, res) => {
  const { turmaId, materiaId } = req.query; // No front-end é 'turmaId', mas no schema é 'turmaIdt'

  if (!turmaId || !materiaId) {
    return res
      .status(400)
      .json({ message: "Os filtros turmaId e materiaId são obrigatórios." });
  }

  try {
    const notas = await prisma.Nota.findMany({
      // Nome correto: Nota
      where: {
        turmaIdt: Number(turmaId), // Filtra pelo 'turmaIdt'
        materiaId: Number(materiaId),
      },
      include: {
        aluno: {
          // Nome da relação no schema: aluno
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { aluno: { name: "asc" } },
    });
    res.json(notas);
  } catch (error) {
    console.error("Erro ao buscar notas:", error);
    res.status(500).json({ message: "Erro ao buscar notas." });
  }
});

// 3. (Aluno) BUSCAR NOTAS POR ID DO ALUNO
app.get("/api/notas/aluno/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const notas = await prisma.Nota.findMany({
      // Nome correto: Nota
      where: {
        alunoId: Number(id), // Nome do campo no schema: alunoId
      },
      include: {
        materia: { select: { nome: true } }, // Relação 'materia'
      },
      orderBy: { materia: { nome: "asc" } },
    });
    res.json(notas);
  } catch (error) {
    console.error("Erro ao buscar notas do aluno:", error);
    res.status(500).json({ message: "Erro ao buscar notas do aluno." });
  }
});

// 4. (Coord.) ATUALIZAR UMA NOTA (Editar)
app.put("/api/notas/:id", async (req, res) => {
  const { id } = req.params;
  const { userId, materiaId, turmaIdt, tipo, valor } = req.body; // 'turmaIdt' voltou

  try {
    const notaAtualizada = await prisma.Nota.update({
      // Nome correto: Nota
      where: { id: Number(id) },
      data: {
        tipo: String(tipo),
        valor: parseFloat(valor),
        alunoId: Number(userId), // Nome do campo no schema: alunoId
        materiaId: Number(materiaId),
        turmaIdt: Number(turmaIdt), // Nome do campo no schema: turmaIdt
      },
    });
    res.json(notaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar nota:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Nota não encontrada." });
    }
    res.status(500).json({ message: "Erro ao atualizar nota." });
  }
});

// 5. (Coord.) EXCLUIR UMA NOTA
app.delete("/api/notas/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.Nota.delete({
      // Nome correto: Nota
      where: {
        id: Number(id),
      },
    });
    res.status(200).json({ message: "Nota excluída com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Nota não encontrada." });
    }
    res.status(500).json({ message: "Erro ao excluir nota." });
  }
});
// Notas
// Adicione esta rota ao seu back-end (server.js)

app.get("/api/frequencia/aluno/:id", async (req, res) => {
  const { id } = req.params; // ID do Aluno (vem do req.params)
  const { mes, ano } = req.query; // Mês e Ano (vem do req.query)

  if (!mes || !ano) {
    return res
      .status(400)
      .json({ message: "O 'mes' e 'ano' são obrigatórios." });
  }

  const alunoIdNum = Number(id);
  const anoNum = Number(ano);
  const mesNum = Number(mes); // API envia 1-indexado (ex: "10" para Outubro)

  // Cria as datas de início e fim para o filtro
  const startDate = new Date(anoNum, mesNum - 1, 1); // Mês no JS é 0-indexado
  const endDate = new Date(anoNum, mesNum, 0, 23, 59, 59); // Dia 0 do próximo mês = último dia deste mês

  try {
    // Busca no modelo Presenca, filtrando pelo alunoId
    // E também filtrando pela data que está no modelo 'Chamadas' relacionado
    const presencas = await prisma.Presenca.findMany({
      where: {
        alunoId: alunoIdNum,
        // Filtra a relação 'chamada'
        chamada: {
          data: {
            gte: startDate, // Maior ou igual ao primeiro dia do mês
            lte: endDate, // Menor ou igual ao último dia do mês
          },
        },
      },
      include: {
        // Inclui os dados da chamada (especialmente a data)
        chamada: {
          select: { data: true, materia: true, nome: true },
        },
      },
    });

    // Formata os dados para o front-end
    // O front-end espera { id, status, data }
    const resultado = presencas.map((p) => ({
      id: p.id,
      status: p.status, // "PRESENCA" ou "FALTA" (do seu Enum 'Status')
      data: p.chamada.data,
      materia: p.chamada.materia,
      chamadaNome: p.chamada.nome,
    }));

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar frequência do aluno:", error);
    res.status(500).json({ message: "Erro ao buscar frequência." });
  }
});
// Inicializa o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}!🚀`);
});
