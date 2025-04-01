import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Lê a chave secreta do JWT a partir do arquivo .env
const JWT_SECRET = process.env.JWT_SECRET;

// Verifica se a chave secreta está definida
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não está definido no arquivo .env.");
}

// Middleware de autenticação
const auth = (req, res, next) => {
  // Pegando o token do cabeçalho Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message:
        'Token não fornecido ou formato inválido. O formato correto é "Bearer <token>"',
    });
  }

  // Extraímos o token do cabeçalho Authorization
  const token = authHeader.split(" ")[1];

  try {
    // Tentando decodificar o token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificando se o token contém as informações esperadas (id e role)
    if (!decoded.id || !decoded.role) {
      return res
        .status(401)
        .json({ message: "Token inválido. Dados do usuário ausentes." });
    }

    // Armazenando as informações decodificadas no req
    req.userId = decoded.id;
    req.userRole = decoded.role;

    console.log(
      "Token validado. Usuário ID:",
      req.userId,
      "Função:",
      req.userRole
    );

    // Continuar para o próximo middleware ou rota
    next();
  } catch (err) {
    console.error("Erro na autenticação:", err.message);

    // Verifica se o erro é de token expirado
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expirado. Faça login novamente.",
      });
    }

    // Se não for erro de expiração, é um token inválido
    return res.status(401).json({
      message: "Token inválido ou acesso negado.",
    });
  }
};

export default auth;
