# ✨ Sistema Escolar - API REST

API desenvolvida com **Express.js**, **Prisma** e **MySQL**, oferecendo funcionalidades para gestão de turmas, usuários, chamadas, diários de presença, avaliações, avisos e um sistema de chat escolar.

---

## 🔐 Autenticação

Algumas rotas exigem token JWT no header:

```http
Authorization: Bearer <token>
```

---

## 📌 Avaliações

### Atualizar avaliação

```http
PATCH /api/avaliacoes/:id
```

FormData:

- `titulo`, `descricao`, `dataInicio`, `dataFim`, `turma`, `documento` (file)

### Deletar avaliação

```http
DELETE /api/avaliacoes/:id
```

---

## 📢 Avisos

### Criar aviso

```http
POST /api/avisos
```

Body JSON:

```json
{
  "titulo": "Aviso Importante",
  "descricao": "Texto do aviso."
}
```

### Listar avisos

```http
GET /api/avisos
```

### Deletar aviso

```http
DELETE /api/avisos/:id
```

---

## 📚 Diários de Presença

### Criar diário

```http
POST /api/diario
```

Body JSON:

```json
{
  "turmaId": 1,
  "presencas": [{ "alunoId": 2, "status": "Presente", "userId": 1 }]
}
```

### Buscar diários por data

```http
GET /api/diarios?data=YYYY-MM-DD
```

---

## 🏫 Turmas

### Criar turma

```http
POST /api/turmas
```

```json
{
  "nome": "Turma A",
  "descricao": "Turma do 3º ano"
}
```

### Adicionar usuário na turma

```http
POST /api/turmas/:turmaId/usuarios
```

```json
{ "userId": 5 }
```

### Listar turmas

```http
GET /api/turmas
```

### Listar usuários da turma

```http
GET /api/turmas/:turmaId/usuarios
```

---

## 🗓️ Presenças

### Registrar presença

```http
POST /api/turmas/:turmaId/presencas
```

```json
{
  "presencas": [
    {
      "alunoId": 1,
      "status": "Falta",
      "data": "2025-04-04",
      "materia": "Matemática",
      "userId": 3
    }
  ]
}
```

### Listar presenças da turma

```http
GET /api/turmas/:turmaId/presencas
```

---

## 💬 Chat Escolar

### Criar novo chat

```http
POST /api/chats
```

```json
{
  "titulo": "Chat da Turma A",
  "participantesIds": [1, 2, 3]
}
```

### Listar todos os chats

```http
GET /api/chats
```

### Buscar chats por usuário

```http
GET /api/chats/:userId
```

### Listar mensagens do chat

```http
GET /api/mensagens/:chatId
```

---

## ❌ Códigos de Erro

- `400`: Requisição inválida
- `404`: Recurso não encontrado
- `500`: Erro interno no servidor

---

## ⚡ Tecnologias

- Node.js + Express
- Prisma ORM
- MySQL
- Autenticação JWT

## git

git add .
git commit -m "sua mensagem de commit"
git push
