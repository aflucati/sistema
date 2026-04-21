## 🚀 Como Rodar o Projeto Integrado

Após a reorganização, o projeto agora é um **monorepo** com frontend e backend no mesmo repositório.

### Setup Inicial (Primeira Vez)

```bash
# 1. Backend - Instalar e configurar
cd sistema/backend
npm install

# Aplicar schema do banco (IMPORTANTE - só na primeira vez)
npm run db:apply-schema

# 2. Frontend - Instalar (em outra aba/terminal)
cd sistema/frontend
npm install
```

### Rodar em Desenvolvimento

**Terminal 1 - Backend** (porta 3001)
```bash
cd sistema/backend
npm run dev
```

**Terminal 2 - Frontend** (porta 8080)
```bash
cd sistema/frontend
npm run dev
```

Acesse: **http://localhost:8080**

O frontend automaticamente conecta na API em http://localhost:3001.

### Variáveis de Ambiente

**Backend** - Criar `sistema/backend/.env`:
```
SUPABASE_URL=<sua-url>
SUPABASE_ANON_KEY=<sua-key>
SUPABASE_SERVICE_ROLE_KEY=<sua-key>
SUPABASE_DB_HOST=<host>
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=<user>
SUPABASE_DB_PASSWORD=<password>
```

**Frontend** - Criar `sistema/frontend/.env`:
```
VITE_API_URL=http://localhost:3001
```

### Build para Produção

```bash
# Backend
cd sistema/backend
npm run build
npm start

# Frontend
cd sistema/frontend
npm run build
npm run preview
```

### Testes de Validação

```bash
# Verificar que cálculos não foram alterados
cd sistema/backend
npm run test:validated        # Valida contra modelo
npm run test:windows          # Testa regras de janelas
npm run test:sat-divergence   # Detecta divergências
```

## 📋 Estrutura de Arquivos Criados/Modificados

### Novos Arquivos

```
sistema/frontend/src/
├── lib/
│   └── api.ts                           # Configuração Axios
├── hooks/api/
│   ├── useCalculateDeadlines.ts         # Upload/cálculo de prazos
│   ├── useGetDeadlines.ts               # Consulta prazos vigentes
│   ├── useSaveDeadline.ts               # Salvar padrão vigente
│   ├── useGetHistory.ts                 # Histórico de prazos
│   ├── useComparePrazos.ts              # Comparação de versões
│   ├── useImportPlanning.ts             # Importar ajustes
│   └── useGetPlanning.ts                # Consulta planejamento
```

### Arquivos Modificados

```
sistema/frontend/
├── package.json                         # Adicionado axios
├── src/pages/
│   ├── GestaoPrazosPage.tsx            # Conectado aos hooks
│   ├── ConsultaPage.tsx                # Conectado aos hooks
│   ├── SalvarPadraoPage.tsx            # Conectado aos hooks
│   └── ImportarAjustePage.tsx          # Conectado aos hooks

sistema/
├── README.md                            # Atualizado com instruções monorepo
```

### Backend (Sem Alterações)

Todos os arquivos de backend permanecem intactos:
- `backend/src/engine.ts` - CORE de cálculos ✅
- `backend/src/databaseRoutes.ts` - Endpoints API ✅
- `backend/src/upload.ts` - Endpoint de upload ✅
- `backend/src/index.ts` - CORS já habilitado ✅

## 🧪 Fluxo de Dados

```
Frontend (React + Vite)
    ↓
useCalculateDeadlines (POST /upload)
    ↓
Backend (Express + Node)
    ↓
engine.ts (Cálculos de prazos)
    ↓
PostgreSQL / Supabase
    ↓
Resultados → Frontend
```

## ⚠️ Pontos Importantes

1. **Lógica de Cálculos Preservada**: Nenhuma alteração em `engine.ts` ou lógica de cálculo
2. **Testes de Validação**: Execute antes e depois para garantir integridade
3. **CORS Habilitado**: Backend permite requisições do frontend
4. **React Query**: Gerencia cache e estado de requisições automaticamente
5. **TypeScript**: Todo código está tipado e validado

## 🐛 Troubleshooting

**Erro: Cannot connect to API**
- Verifique se backend está rodando em `http://localhost:3001`
- Verifique se CORS está habilitado em `backend/src/index.ts`

**Erro: EADDRINUSE Port 3001**
- Há outro processo na porta 3001
- Use: `lsof -i :3001` (Mac/Linux) ou `netstat -ano | findstr :3001` (Windows)

**npm install lento**
- Tente limpar cache: `npm cache clean --force`
- Use `npm ci` ao invés de `npm install` em CI/produção

## 📚 Próximos Passos

- [ ] Rodar testes baseline (antes do primeiro deploy)
- [ ] Fazer testes E2E (upload arquivo → validar resultados)
- [ ] Deploy em staging
- [ ] Deploy em produção
