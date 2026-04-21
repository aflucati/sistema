# ⚠️ ANÁLISE: Métricas Faltantes no Novo Frontend

## Status Atual vs. Esperado

O Lovable **simplificou e perdeu métricas importantes** que existiam na implementação original.

---

## ❌ O QUE ESTÁ FALTANDO NO NOVO FRONTEND

### **Seção 1: Índices de Handover (HD)** - COMPLETAMENTE AUSENTE
Estas métricas medem a **qualidade da operação de CD (entrega)**.

#### HD0 (Handover Day 0)
- **Label**: "HD0"
- **Descrição**: % de horas ofertadas com prazo CD = 0 dias
- **Tipo**: Percentual com ponderação
- **Fórmula (Weighted)**:
```javascript
// Horas ofertadas com prazoCd === 0, dividido por total de horas
const hd0 = consolidatedRows
  .filter(row => Number(row.prazoCd) === 0)
  .reduce((total, row) => total + getOfferHours(row), 0) 
  / totalOfferHours * 100;
```

**Formato**: X.X% (ex: "45.2%")

---

#### HD1 (Handover até 1 dia)
- **Label**: "HD1"
- **Descrição**: % de horas ofertadas com prazo CD ≤ 1 dia
- **Tipo**: Percentual com ponderação

**Fórmula**:
```javascript
const hd1 = consolidatedRows
  .filter(row => Number(row.prazoCd) <= 1)
  .reduce((total, row) => total + getOfferHours(row), 0) 
  / totalOfferHours * 100;
```

**Formato**: X.X%

---

#### HD2 (Handover até 2 dias)
- **Label**: "HD2"
- **Descrição**: % de horas ofertadas com prazo CD ≤ 2 dias
- **Tipo**: Percentual com ponderação

**Fórmula**:
```javascript
const hd2 = consolidatedRows
  .filter(row => Number(row.prazoCd) <= 2)
  .reduce((total, row) => total + getOfferHours(row), 0) 
  / totalOfferHours * 100;
```

**Formato**: X.X%

---

### **Seção 2: Índices de Entrega Express (D+)** - PARCIALMENTE AUSENTE
Estas métricas medem a **qualidade do prazo ofertado ao cliente**.

#### D+0 (Delivery Day 0)
- **Label**: "D+0"
- **Descrição**: % de horas ofertadas com prazo Cliente = 0 dias
- **Tipo**: Percentual com ponderação
- **Fórmula**:
```javascript
const d0 = consolidatedRows
  .filter(row => Number(row.prazoCliente) === 0)
  .reduce((total, row) => total + getOfferHours(row), 0) 
  / totalOfferHours * 100;
```

**Formato**: X.X%

---

#### D+1 (Delivery até 1 dia)
- **Label**: "D+1"
- **Descrição**: % de horas ofertadas com prazo Cliente ≤ 1 dia
- **Tipo**: Percentual com ponderação
- **Fórmula**:
```javascript
const d1 = consolidatedRows
  .filter(row => Number(row.prazoCliente) <= 1)
  .reduce((total, row) => total + getOfferHours(row), 0) 
  / totalOfferHours * 100;
```

**Formato**: X.X%

---

#### D+2 (Delivery até 2 dias)
- **Label**: "D+2"
- **Descrição**: % de horas ofertadas com prazo Cliente ≤ 2 dias
- **Tipo**: Percentual com ponderação
- **Fórmula**:
```javascript
const d2 = consolidatedRows
  .filter(row => Number(row.prazoCliente) <= 2)
  .reduce((total, row) => total + getOfferHours(row), 0) 
  / totalOfferHours * 100;
```

**Formato**: X.X%

**⚠️ Nota**: O novo frontend mostra "Expressos (D0-D2)" = um único card agregado com `prazoCliente <= 2`. Isto **perder informação** de D0 e D1 separados.

---

## 🔧 Funções Auxiliares Necessárias

### getOfferHours(row)
Calcula as horas ofertadas de uma linha.

```javascript
function countOkDays(row) {
  // Conta quantos dias da semana estão "OK"
  return ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']
    .reduce((total, dayKey) => total + (row[dayKey] === 'OK' ? 1 : 0), 0);
}

function getOfferHours(row) {
  // Duração da janela × dias em que está OK
  const duration = Math.max(0, Number(row.horarioFinal) - Number(row.horarioInicial));
  return duration * countOkDays(row);
}
```

---

### getConsolidatedMetricRows(rows)
Consolida/agrupa linhas por chave de métrica para evitar duplicação.

```javascript
function getMetricsGroupKey(row) {
  return [
    row.cd,
    row.geography,
    row.commercialLocation,
    row.locality,
    row.metodoCd,
    row.prazoCd,
    row.metodoTr,
    row.prazoTr,
    row.prazoCliente,
    row.domingo,
  ].join('|');
}

function getConsolidatedMetricRows(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = getMetricsGroupKey(row);
    if (!grouped.has(key)) {
      grouped.set(key, row);
    }
  });
  return [...grouped.values()];
}
```

---

### weightedShare(predicate)
Calcula o percentual **ponderado** de linhas que atendem um critério.

```javascript
function weightedShare(predicate) {
  const consolidatedRows = getConsolidatedMetricRows(rows);
  const totalOfferHours = consolidatedRows.reduce((total, row) => total + getOfferHours(row), 0);
  
  if (totalOfferHours === 0) return 0;

  const matchingHours = consolidatedRows.reduce((total, row) => {
    return total + (predicate(row) ? getOfferHours(row) : 0);
  }, 0);

  return (matchingHours / totalOfferHours) * 100;
}
```

---

## 📊 Comparação: Antigas vs. Novas

### ANTIGAS (Esperadas) - 21 Métricas
```
Linha 1 - Base (3 cards):
  - Rotas filtradas
  - Linhas filtradas
  - Horas ofertadas

Linha 2 - Prazos (3 cards):
  - Prazo médio CD
  - Prazo médio TR
  - Prazo médio Cliente

Linha 3 - HD Index (3 cards):
  - HD0
  - HD1
  - HD2

Linha 4 - Express Index (3 cards):
  - D+0
  - D+1
  - D+2

Linha 5 - Distribuição (6 cards):
  - CDs únicos
  - Modais únicos
  - Geografias únicas
  - Loc. Comerciais
  - Sem horário
  - Expressos % (simples)
```

### NOVAS (Lovable) - 12 Métricas
```
Linha 1 (6 cards):
  - Linhas
  - Prazo médio Cliente
  - Prazo médio CD
  - Prazo médio TR
  - Prazo máximo Cliente
  - Prazo mínimo Cliente

Linha 2 (6 cards):
  - CDs únicos
  - Modais únicos
  - Geografias únicas
  - Loc. Comerciais
  - Sem horário
  - Expressos (D0-D2)%
```

---

## ⚖️ Diferenças Críticas

| Métrica | Antiga | Nova | Diferença |
|---------|--------|------|-----------|
| HD0, HD1, HD2 | ✅ 3 cards | ❌ 0 | **PERDEU 3** |
| D+0, D+1, D+2 | ✅ 3 cards (separados) | ❌ 1 agregado | **PERDEU detalhe** |
| Rotas filtradas | ✅ | ❌ | **PERDEU** |
| Linhas filtradas | ✅ | ✅ | OK |
| Horas ofertadas | ✅ | ❌ | **PERDEU** |
| Prazos (Médio CD/TR/Cliente) | ✅ | ✅ | OK |
| CDs/Modais/Geografias únicos | ✅ | ✅ | OK |
| Prazo máximo/mínimo | ❌ | ✅ | **NOVO** |
| Sem horário | ✅ | ✅ | OK |
| Expressos (simples) | ✅ (% simples) | ✅ (agregado) | **MUDOU** |

---

## 🎯 Recomendação

Para **restaurar a implementação original**:

1. **Adicionar HD0, HD1, HD2** como 3 cards novos (seção "Índice HD")
2. **Separar D+0, D+1, D+2** em 3 cards distintos (seção "Índice Express")
3. **Adicionar Horas ofertadas** como métrica de baseline
4. **Adicionar Rotas filtradas** como métrica de distribuição
5. **Manter** CDs/Modais/Geografias/Sem horário
6. **Decidir** se mantém "Prazo máximo/mínimo" (nova feature do Lovable)

---

## 📋 Checklist para Lovable

Se reenviar para implementação, usar esta lista:

- [ ] Adicionar seção "Índice HD" com 3 cards (HD0, HD1, HD2)
- [ ] Adicionar seção "Índice Express" com 3 cards (D+0, D+1, D+2)
- [ ] Implementar funções: `getOfferHours()`, `countOkDays()`, `weightedShare()`
- [ ] Adicionar métrica "Horas ofertadas" no baseline
- [ ] Adicionar métrica "Rotas filtradas" no baseline
- [ ] Manter grid responsivo (2-3-6 colunas)
- [ ] Formatar percentuais com 1 casa decimal + "%"
- [ ] Testar com dados do backend real

---

## Versão
- **v1.0** - 21/04/2026
- **Origem**: Comparação backend/public/index.html vs. frontend novo
- **Status**: Pronto para reenvio ao Lovable

