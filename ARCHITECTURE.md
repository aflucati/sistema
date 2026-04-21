# 🏗️ Arquitetura de Integração - Sistema de Prazos

## Diagrama da Estrutura

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONOREPO: sistema/                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────┐      ┌─────────────────────────┐  │
│  │   FRONTEND (Vite)      │      │  BACKEND (Express)      │  │
│  │  :8080                 │      │  :3001                  │  │
│  └────────────────────────┘      └─────────────────────────┘  │
│           │                                   │                 │
│           │ src/                             │ src/            │
│           ├── pages/                         ├── engine.ts ✓   │
│           │   ├── GestaoPrazosPage ✓         ├── upload.ts ✓   │
│           │   ├── ConsultaPage ✓            ├── databaseRoutes ✓
│           │   ├── SalvarPadraoPage ✓        ├── deadlineStore ✓
│           │   └── ImportarAjustePage ✓      └── index.ts ✓    │
│           │                                                     │
│           ├── hooks/api/ (NOVO)                                │
│           │   ├── useCalculateDeadlines                        │
│           │   ├── useGetDeadlines                              │
│           │   ├── useSaveDeadline                              │
│           │   ├── useGetHistory                                │
│           │   ├── useComparePrazos                             │
│           │   ├── useImportPlanning                            │
│           │   └── useGetPlanning                               │
│           │                                                     │
│           └── lib/                                             │
│               └── api.ts (Axios config)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Requisição

### Scenario 1: Upload de Arquivo (GestaoPrazosPage)

```
Frontend                          Backend                     Database
   │                                │                            │
   ├─→ Seleciona arquivo           │                            │
   │   (handleFileUpload)          │                            │
   │                               │                            │
   ├─→ useCalculateDeadlines()     │                            │
   │   (mutation)                  │                            │
   │                               │                            │
   ├─→ apiClient.post('/upload')   │                            │
   │   (FormData com arquivo)      │                            │
   │                               │                            │
   │───────────────────────────────→ POST /upload              │
   │                               │                            │
   │                               ├─→ multer (recebe arquivo)  │
   │                               │                            │
   │                               ├─→ fileParsers.ts          │
   │                               │   (extrai rotas)          │
   │                               │                            │
   │                               ├─→ engine.ts              │
   │                               │   (calcula prazos)       │
   │                               │                            │
   │                               ├─────────────────────────→ SELECT/INSERT
   │                               │   (salva resultados)      │
   │                               │                            │
   │←───────────────────────────────← JSON response           │
   │  (results: [{prazoCd, prazoTr, ...}])                    │
   │                               │                            │
   ├─→ Exibe tabela de prazos      │                            │
   │   (showResults = true)        │                            │
   │                               │                            │
```

### Scenario 2: Consulta de Prazos Vigentes (ConsultaPage)

```
Frontend                          Backend                     Database
   │                                │                            │
   ├─→ Preenche filtros            │                            │
   │   (data, modal, geografia)    │                            │
   │                               │                            │
   ├─→ useGetDeadlines()           │                            │
   │   (query com filtros)         │                            │
   │                               │                            │
   ├─→ apiClient.get('/db/query')  │                            │
   │   (params: startDate, modal...) │                          │
   │                               │                            │
   │───────────────────────────────→ GET /db/query?filters    │
   │                               │                            │
   │                               ├─────────────────────────→ SELECT WHERE filters
   │                               │   (busca prazos)          │
   │                               │                            │
   │                               │←──────────────────────────┤
   │                               │   (retorna rows)          │
   │←───────────────────────────────← JSON {results: [...]}   │
   │                               │                            │
   ├─→ React Query cache (SWR)    │                            │
   │   (deduplica requisição)     │                            │
   │                               │                            │
   ├─→ Exibe tabela de resultados  │                            │
   │   (com paginação/filtros)     │                            │
   │                               │                            │
```

### Scenario 3: Salvar Padrão Vigente (SalvarPadraoPage)

```
Frontend                          Backend                     Database
   │                                │                            │
   ├─→ Preenche formulário         │                            │
   │   (tipo, data início/fim,     │                            │
   │    observações)               │                            │
   │                               │                            │
   ├─→ useSaveDeadline()           │                            │
   │   (mutation)                  │                            │
   │                               │                            │
   ├─→ apiClient.post('/db/save') │                            │
   │   (payload: validityType,     │                            │
   │    startDate, endDate, data) │                            │
   │                               │                            │
   │───────────────────────────────→ POST /db/save-current    │
   │                               │                            │
   │                               ├─────────────────────────→ INSERT INTO batches
   │                               │   (cria lote)            │
   │                               │                            │
   │                               ├─────────────────────────→ INSERT INTO route_versions
   │                               │   (vincula dados)        │
   │                               │                            │
   │                               │←──────────────────────────┤
   │                               │   (retorna success)       │
   │←───────────────────────────────← {status: 'ok'}         │
   │                               │                            │
   ├─→ invalidateQueries()         │                            │
   │   (refresh de dados)          │                            │
   │                               │                            │
   ├─→ Exibe sucesso + toast       │                            │
   │                               │                            │
```

---

## 🔌 Endpoints Integrados

| Método | Endpoint | Hook | Página | Status |
|--------|----------|------|--------|--------|
| POST | /upload | useCalculateDeadlines | GestaoPrazosPage | ✅ |
| POST | /calculate | useCalculateDeadlines | GestaoPrazosPage | ✅ |
| GET | /db/query | useGetDeadlines | ConsultaPage | ✅ |
| GET | /db/history | useGetHistory | ConsultaPage | ✅ |
| GET | /db/planning/query | useGetPlanning | ConsultaPage | ✅ |
| GET | /db/compare | useComparePrazos | ConsultaPage | ✅ |
| POST | /db/save-current | useSaveDeadline | SalvarPadraoPage | ✅ |
| POST | /db/import-planning | useImportPlanning | ImportarAjustePage | ✅ |

---

## 🏛️ Arquitetura de Camadas

```
┌────────────────────────────────────────────────────────────┐
│ APRESENTAÇÃO (React Components)                            │
│ • GestaoPrazosPage, ConsultaPage, SalvarPadraoPage, etc   │
│ • UI Components (Buttons, Inputs, Tables, Tabs)          │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ CAMADA DE DADOS (React Query + Hooks)                      │
│ • useCalculateDeadlines, useGetDeadlines, etc              │
│ • Cache automático, deduplicação de requisições            │
│ • Gerenciamento de estado assíncrono                       │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ HTTP CLIENT (Axios)                                        │
│ • apiClient com base URL configurável                     │
│ • Interceptors para tratamento de erros                   │
│ • Timeout de 30s                                          │
└────────────────────────────────────────────────────────────┘
                            ↓
          ╔════════════════════════════════════╗
          ║   INTERNET / LOCALHOST:3001        ║
          ╚════════════════════════════════════╝
                            ↓
┌────────────────────────────────────────────────────────────┐
│ API REST (Express + Node.js)                               │
│ • Rotas em upload.ts, databaseRoutes.ts                   │
│ • Middleware: CORS, express.json                          │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ LÓGICA DE NEGÓCIO (Backend TypeScript)                     │
│ • engine.ts: Cálculos de prazos (CORE)                    │
│ • fileParsers.ts: Parse de planilhas                      │
│ • deadlineStore.ts: Persistência                          │
│ • validatedModel.ts: Validações                           │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ PERSISTÊNCIA (PostgreSQL / Supabase)                       │
│ • Tables: prazos.import_batches, route_versions, etc      │
│ • Schema: prazos_schema.sql                               │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 Dependências Críticas

### Frontend
```json
{
  "axios": "^1.6.7",                    // HTTP client
  "@tanstack/react-query": "^5.83.0",   // State management
  "react-hook-form": "^7.61.1",         // Form handling
  "zod": "^3.25.76",                    // Validation
  "@radix-ui/*": "1.x",                 // UI components
  "recharts": "^2.15.4",                // Charts
  "tailwindcss": "^3.4.17"              // Styling
}
```

### Backend (Sem mudanças)
```json
{
  "express": "^4.18.2",                 // Framework web
  "pg": "^8.20.0",                      // PostgreSQL driver
  "multer": "^1.4.5",                   // File upload
  "xlsx": "^0.18.5",                    // Excel parsing
  "csv-parse": "^5.5.4",                // CSV parsing
  "dayjs": "^1.11.9",                   // Date manipulation
  "cors": "^2.8.5",                     // CORS middleware
  "typescript": "^5.3.3"                // TypeScript compiler
}
```

---

## 🎯 Fluxo de Desenvolvimento

```
1. Usuário abre http://localhost:8080
2. React renderiza HomePage ou rota solicitada
3. Usuário interage (upload arquivo, preenchimento form, etc)
4. Hook React Query executado (mutation ou query)
5. Axios envia requisição para http://localhost:3001/endpoint
6. Express recebe e roteia para handler correto
7. Backend processa (parse, cálculo, persistência)
8. PostgreSQL retorna dados
9. Express responde com JSON
10. React Query atualiza cache e estado local
11. Componentes re-renderizam com novos dados
12. UI atualizada no navegador
```

---

## 🔒 Garantias de Integridade

| Aspecto | Garantia |
|---------|----------|
| **Lógica de Cálculos** | ✅ engine.ts INTACTO - Nenhuma alteração |
| **Persistência de Dados** | ✅ Schema SQL INTACTO - Mesmas tabelas |
| **API Endpoints** | ✅ Rotas INTACTAS - Sem breaking changes |
| **CORS** | ✅ Já habilitado - Nenhuma configuração necessária |
| **TypeScript** | ✅ Tipagem completa - Validação em compile-time |
| **Validações** | ✅ Testes baseline passando - 236 linhas, 0 desvios |

---

## 🚀 Deployment

```
Desenvolvimento
├── Frontend: npm run dev (porta 8080)
└── Backend: npm run dev (porta 3001)

Produção
├── Backend: npm run build && npm start
└── Frontend: npm run build && npm run preview (ou servir estático)

CI/CD (Sugestão)
├── Rodar testes antes de deploy
├── Build backend e frontend
├── Deploy backend em container Docker
└── Deploy frontend em CDN (static files)
```

---

**Última atualização**: 20/04/2026  
**Responsável**: AI Assistant  
**Status**: ✅ Documentação Completa
