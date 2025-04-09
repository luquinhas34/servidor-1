# 📘 Documentação de Instalação e Configuração do Prisma

**Projeto:** [servidor-1](https://github.com/luquinhas34/servidor-1)

## ✅ Pré-requisitos

- Node.js (v18+ recomendado)
- npm ou yarn
- Banco de dados (MySQL, PostgreSQL, SQLite etc.)
- Git instalado

---

## 🌀 0. Iniciando o Repositório Local (caso ainda não tenha feito)

```bash
git init
```

---

## ➕ 0.1 Adicionando os arquivos e commitando

```bash
git add .
git commit -m "primeiro commit"
```

---

## 🔗 0.2 Conectando ao Repositório do GitHub

No GitHub, crie um repositório vazio (sem README, .gitignore, etc.). Depois copie o link HTTPS ou SSH.

Exemplo (HTTPS):

```bash
git remote add origin https://github.com/seu-usuario/nome-do-repo.git
```

---

## 🚀 0.3 Enviando para o GitHub

```bash
git push -u origin main
```

> Se seu branch local for `master`, substitua `main` por `master`

---

## 📁 1. Clonando o Projeto

```bash
git clone https://github.com/luquinhas34/servidor-1.git
cd servidor-1
```

---

## 📦 2. Instalando as Dependências

```bash
npm install
# ou
yarn install
```

---

## 🛠️ 3. Configurando o Prisma

### a) Inicializando Prisma (caso não esteja iniciado)

```bash
npx prisma init
```

Esse comando criará:

- A pasta `prisma/` com o arquivo `schema.prisma`
- O arquivo `.env` para armazenar variáveis

### b) Editando `.env`

```env
DATABASE_URL="mysql://usuario:senha@localhost:3000/nome_do_banco"
```

> 🔒 Substitua `usuario`, `senha` e `nome_do_banco` com seus dados reais.

---

## 📤 4. Executando as Migrações

```bash
npx prisma migrate dev
```

---

## ⚙️ 5. Gerando o Prisma Client

```bash
npx prisma generate
```

---

## 🧪 6. Testando o Projeto

```bash
node server.js
```

---

## 📚 Recursos Úteis

- [Documentação Oficial do Prisma](https://www.prisma.io/docs)
- [Prisma no YouTube (DevPleno)](https://www.youtube.com/watch?v=NDWV5hHSPBk)
