# Sistema de Gestão de Prazos de Entrega

**Monorepo: Frontend (Vite + React) + Backend (Node.js + Express)**

## 📁 Estrutura do Projeto

```
sistema/
├── backend/                    # API REST - Node.js, Express, TypeScript
│   ├── src/                    # Código-fonte (engine, cálculos, rotas)
│   ├── sql/                    # Schema PostgreSQL (Supabase)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Interface Web - React, Vite, TypeScript
│   ├── src/
│   │   ├── pages/             # GestaoPrazosPage, ConsultaPage, etc.
│   │   ├── hooks/api/         # React Query hooks (NEW)
│   │   ├── lib/api.ts         # Axios config (NEW)
│   │   └── components/
│   ├── package.json
│   └── vite.config.ts
│
├── gestão_de_prazos/          # Arquivos base (templates, PCP.csv)
├── frontend-old/              # Backup do frontend antigo (v1)
└── README.md                  # Este arquivo
```

## 🎯 Funcionalidades

- ✅ Upload de planilha CSV/XLSX logística
- ✅ Cálculo de prazos (CD, TR, Cliente) via `engine.ts`
- ✅ Persistência em PostgreSQL (Supabase)
- ✅ Consulta de histórico e planejamento
- ✅ Salvar/importar ajustes pontuais
- ✅ Validação automática contra modelos
- ✅ **12 Indicadores/Métricas** em tempo real (linhas, prazos médios/máx/min, CDs/modais/geografias únicas, expressas)
- ✅ **19 Colunas** com detalhes completos (localidade, métodos, dias da semana)
- ✅ **4 Formatos de Exportação** (HTML, XLSX, CSV, Clipboard)

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- npm 9+
- PostgreSQL (Supabase) com variáveis de ambiente configuradas

### Setup Inicial

```bash
# Instalar dependências do backend
cd backend
npm install
npm run db:apply-schema  # Aplicar schema ao banco (primeira vez)

# Instalar dependências do frontend (em outra aba/terminal)
cd frontend
npm install
```

### Desenvolvimento

**Terminal 1 - Backend (porta 3001):**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend (porta 8080):**
```bash
cd frontend
npm run dev
```

Acesse: http://localhost:8080 (frontend automáticamente conecta em http://localhost:3001 para API)

### Build para Produção

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

## 🧪 Validação de Cálculos

Para garantir que a lógica de prazos não foi alterada:

```bash
cd backend
npm run test:validated        # Testa contra modelo validado
npm run test:windows          # Testa regras de janelas (PCP.csv)
npm run test:sat-divergence   # Detecta divergências SAT
```

**Importante:** Executar os testes **antes** e **depois** da integração para garantir zero regressões nos cálculos.

## 📊 Indicadores e Exportação (v2.1)

### 12 Indicadores em Tempo Real

Após upload de arquivo CSV, o sistema exibe:

**Linha 1:**
- **Linhas** — Total de registros processados
- **Prazo médio Cliente** — Média de dias até entrega final
- **Prazo médio CD** — Média de dias até CD
- **Prazo médio TR** — Média de dias na transportadora
- **Prazo máximo Cliente** — Maior prazo
- **Prazo mínimo Cliente** — Menor prazo

**Linha 2:**
- **CDs únicos** — Quantidade de centros de distribuição
- **Modais únicos** — Quantidade de modais de transporte
- **Geografias únicas** — Quantidade de regiões geográficas
- **Loc. Comerciais** — Quantidade de localizações comerciais
- **Sem horário** — Registros sem horário de saída
- **Expressos (D0-D2)%** — Percentual de rotas express

### 19 Colunas Completas

Tabela exibe todas as informações:
- CD, Modal, Geografia, Loc. Comercial, Localidade
- Método de Oferta (CD e TR), Prazo (CD, TR, Cliente)
- Horários (Inicial, Final)
- Disponibilidade por Dia da Semana (Seg-Dom)

### 4 Formatos de Exportação

| Formato | Uso | Compatibilidade |
|---------|-----|-----------------|
| **HTML** | Visualização em navegador | Todos os navegadores |
| **XLSX** | Análise em Excel | Excel, LibreOffice, Google Sheets |
| **CSV** | Importação em outro sistema | Qualquer planilha/software |
| **Clipboard** | Colar direto em outro programa | Excel, Google Sheets, Outlook |

**Implementação:** Sem dependências externas, usa APIs nativas (Blob, navigator.clipboard)

## 📡 API Endpoints

### Cálculo de Prazos
- `POST /upload` — Upload de arquivo CSV/XLSX
- `POST /calculate` — Cálculo manual de rotas

### Persistência
- `POST /db/save-current` — Salva prazos atuais
- `POST /db/import-validated` — Importa planilha validada
- `GET /db/query` — Consulta prazos por filtros
- `GET /db/history` — Histórico de prazos
- `GET /db/compare` — Compara versões

### Planejamento
- `POST /db/save-planning-current` — Salva planejamento
- `POST /db/import-planning` — Importa planejamento
- `GET /db/planning/query` — Consulta planejamento
- `GET /db/planning/history` — Histórico de planejamento

## 🔐 Variáveis de Ambiente

### Backend (`backend/.env`)
```
SUPABASE_URL=<URL>
SUPABASE_ANON_KEY=<KEY>
SUPABASE_SERVICE_ROLE_KEY=<KEY>
SUPABASE_DB_HOST=<HOST>
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=<USER>
SUPABASE_DB_PASSWORD=<PASSWORD>
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:3001
```

## ⚠️ Importante

**NÃO MODIFICAR** a lógica de cálculos em `backend/src/engine.ts` — foi validada contra modelo real.  
Se precisar ajustes, executar testes (`npm run test:*`) após qualquer mudança.

## 📝 Histórico

- **v2.1 (Atual):** Indicadores expandidos (3→12), colunas completas (9→19), exportação com 4 formatos
- **v2 (Anterior):** Frontend Lovable (Vite) + Backend original Node.js (integrados)
- **v1 (Antiga):** Backend + Frontend CRA (em `frontend-old/` como referência)
