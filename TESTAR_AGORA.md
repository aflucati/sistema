# 🎯 SISTEMA RODANDO - INSTRUÇÕES PARA TESTES

**Data**: 20/04/2026 ~ 12:30  
**Status**: ✅ Backend (3001) + Frontend (8080) Operacionais

---

## 🌐 Acesse Agora

Abra seu navegador em:
```
http://localhost:8080
```

---

## ✅ Verificação Rápida

### Backend Respondendo?
```
Status: ✅ 200 OK
URL: http://localhost:3001
```

### Frontend Carregou?
```
Status: ✅ 200 OK
URL: http://localhost:8080
```

---

## 🧪 Testes Recomendados (Em Ordem)

### 1. Teste Gestão de Prazos (5 min)
```
1. Clique em "Gestão de Prazos" (menu lateral)
2. Arraste um arquivo CSV ou clique "Importar"
3. Aguarde cálculo (deve aparecer tabela com prazos)
4. Verifique colunas: CD, Modal, Geografia, Prazo CD/TR/Cliente

✅ Esperado: Tabela preenche com dados calculados
```

### 2. Teste Consulta (5 min)
```
1. Clique em "Consulta" (menu lateral)
2. Preencha filtros:
   - Data: 2026-04-20
   - Modal: (deixe em branco ou selecione)
3. Clique "Consultar Vigente"
4. Verifique tabela com resultados

✅ Esperado: Dados aparecem da API backend
```

### 3. Teste Salvar Padrão (3 min)
```
1. Clique em "Salvar Padrão" (menu lateral)
2. Preencha:
   - Tipo: Padrão
   - Data Início: 2026-04-20
   - Data Fim: 2026-12-31
   - Observações: Teste
3. Clique "Salvar Padrão Vigente"

✅ Esperado: Mensagem de sucesso aparece
```

### 4. Teste Importar Ajuste (5 min)
```
1. Clique em "Importar Ajuste" (menu lateral)
2. Selecione tipo: "Feriado"
3. Arraste arquivo ou clique "Selecionar"
4. Preencha:
   - Data: 2026-05-01
   - Observação: Teste
5. Clique "Importar"

✅ Esperado: Upload processa sem erros
```

---

## 🔍 Verificar Integração API (DevTools)

Abra **F12** → **Network** e teste:

### Para Gestão de Prazos (Upload):
```
POST http://localhost:3001/upload
Status esperado: 200
Response: JSON com prazos calculados
```

### Para Consulta:
```
GET http://localhost:3001/db/query?date=2026-04-20
Status esperado: 200
Response: JSON com dados vigentes
```

---

## 📊 Dados de Teste

Se não tiver arquivo CSV, use este template:

```csv
cd,modal,geografia,data_inicio,data_fim
001,Rodoviário,São Paulo,2026-04-20,2026-04-25
002,Aéreo,Rio de Janeiro,2026-04-20,2026-04-28
003,Marítimo,Salvador,2026-04-20,2026-05-05
```

---

## 🆘 Se Algo Não Funcionar

### Frontend em branco?
```
1. Abra F12 (DevTools)
2. Veja console para erros
3. Verifique se VITE_API_URL está correto em .env
4. Recarregue a página (Ctrl+Shift+R)
```

### API retorna erro?
```
1. Verifique backend rodando: netstat -ano | findstr 3001
2. Se não estiver, rode: cd sistema/backend && npm run dev
3. Verifique variáveis .env (SUPABASE_*)
```

### Porta já em uso?
```
# Libere a porta
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Ou mude a porta em backend/.env (PORT=3002)
```

---

## 📱 Páginas Disponíveis

- **Home** - Página inicial (http://localhost:8080/)
- **Gestão de Prazos** - Upload e cálculo (http://localhost:8080/gestao-prazos)
- **Consulta** - Filtros e busca (http://localhost:8080/consulta)
- **Salvar Padrão** - Formulário (http://localhost:8080/salvar-padrao)
- **Importar Ajuste** - Upload de ajustes (http://localhost:8080/importar-ajuste)
- **Ajuda** - Documentação (http://localhost:8080/ajuda)

---

## 📈 Métricas de Sucesso

Se todo o acima passar, você tem:

- ✅ Monorepo funcional
- ✅ Backend em Node/Express responsivo
- ✅ Frontend em React/Vite carregando
- ✅ Integração API via Axios funcionando
- ✅ React Query sincronizando dados
- ✅ 4 páginas conectadas à API real
- ✅ Sistema de prazos operacional

---

## 🎉 Tudo Funcionando?

Se todos os testes passaram:

```
✅ Sistema está 100% operacional
✅ Pronto para produção
✅ Zero regressões comprovadas
✅ Testes de validação OK
```

---

**Boa sorte com os testes! 🚀**

Qualquer dúvida, consulte:
- [QUICK_START.md](QUICK_START.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md)
