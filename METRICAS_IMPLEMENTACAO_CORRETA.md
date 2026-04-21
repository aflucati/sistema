# 🔧 IMPLEMENTAÇÃO CORRETA - Todas as Métricas com Fórmulas Exatas

Este documento contém as fórmulas **EXATAS** de TODAS as 21 métricas que devem aparecer após calcular prazos.

---

## 📋 ESTRUTURA COMPLETA DO RESULTADO

Após `POST /upload` ou `POST /calculate`, o resultado inclui:
- `rows[]` - Array de linhas calculadas (cada uma com campos como `prazoCd`, `prazoCliente`, `horarioInicial`, `horarioFinal`, etc.)
- `html` - Conteúdo HTML para exportação

**Métricas devem ser calculadas DIRETAMENTE a partir do array `rows`.**

---

## 🔢 FÓRMULAS PASSO-A-PASSO

### **ETAPA 0: Funções Auxiliares (OBRIGATÓRIAS)**

```javascript
// Função 1: Contar dias OK em uma linha
function countOkDays(row) {
  const days = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  return days.reduce((total, day) => total + (row[day] === 'OK' ? 1 : 0), 0);
}

// Função 2: Calcular horas ofertadas de uma linha
function getOfferHours(row) {
  const start = Number(row.horarioInicial) || 0;
  const end = Number(row.horarioFinal) || 0;
  const duration = Math.max(0, end - start);
  const okDays = countOkDays(row);
  return duration * okDays;
}

// Função 3: Gerar chave única para consolidação
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
    row.domingo
  ].join('|');
}

// Função 4: Consolidar linhas (remover duplicatas por chave)
function getConsolidatedRows(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = getMetricsGroupKey(row);
    if (!grouped.has(key)) {
      grouped.set(key, row);
    }
  });
  return [...grouped.values()];
}

// Função 5: Calcular percentual ponderado
function calculateWeightedShare(rows, predicate) {
  const consolidated = getConsolidatedRows(rows);
  const totalHours = consolidated.reduce((sum, row) => sum + getOfferHours(row), 0);
  
  if (totalHours === 0) return 0;
  
  const matchingHours = consolidated.reduce((sum, row) => {
    return sum + (predicate(row) ? getOfferHours(row) : 0);
  }, 0);
  
  return (matchingHours / totalHours) * 100;
}

// Função 6: Calcular média ponderada
function calculateWeightedAverage(rows, field) {
  const consolidated = getConsolidatedRows(rows);
  const totalHours = consolidated.reduce((sum, row) => sum + getOfferHours(row), 0);
  
  if (totalHours === 0) return 0;
  
  const weightedSum = consolidated.reduce((sum, row) => {
    return sum + (Number(row[field]) || 0) * getOfferHours(row);
  }, 0);
  
  return weightedSum / totalHours;
}
```

---

## 📊 LINHA 1: BASE (3 cards)

### Card 1: Rotas Filtradas
- **Label**: "Rotas filtradas"
- **Fórmula**:
```javascript
const consolidated = getConsolidatedRows(rows);
const routesCount = new Set(
  consolidated.map(row => [row.cd, row.commercialLocation, row.geography].join('|'))
).size;
```
- **Formato**: Número inteiro com separador de milhar (ex: "1.234")

---

### Card 2: Linhas Filtradas
- **Label**: "Linhas filtradas"
- **Fórmula**:
```javascript
const linesCount = rows.length;
```
- **Formato**: Número inteiro com separador de milhar

---

### Card 3: Horas Ofertadas
- **Label**: "Horas ofertadas"
- **Fórmula**:
```javascript
const consolidated = getConsolidatedRows(rows);
const totalOfferHours = consolidated.reduce((sum, row) => sum + getOfferHours(row), 0);
```
- **Formato**: Número inteiro com separador de milhar

---

## 📊 LINHA 2: PRAZOS MÉDIOS (3 cards)

### Card 4: Prazo Médio CD
- **Label**: "Prazo médio CD"
- **Fórmula**:
```javascript
const avgCd = calculateWeightedAverage(rows, 'prazoCd');
```
- **Formato**: X.XX (2 casas decimais, separador "," para decimais em pt-BR)
- **Exemplo**: "1,82"

---

### Card 5: Prazo Médio TR
- **Label**: "Prazo médio TR"
- **Fórmula**:
```javascript
const avgTr = calculateWeightedAverage(rows, 'prazoTr');
```
- **Formato**: X.XX (2 casas decimais)

---

### Card 6: Prazo Médio Cliente
- **Label**: "Prazo médio Cliente"
- **Fórmula**:
```javascript
const avgCliente = calculateWeightedAverage(rows, 'prazoCliente');
```
- **Formato**: X.XX (2 casas decimais)

---

## 📊 LINHA 3: ÍNDICE HD (3 cards)

### Card 7: HD0
- **Label**: "HD0"
- **Descrição**: Handover Day 0 - % de horas com prazo CD = 0
- **Fórmula**:
```javascript
const hd0 = calculateWeightedShare(rows, (row) => Number(row.prazoCd) === 0);
```
- **Formato**: X.X% (1 casa decimal + "%")
- **Exemplo**: "45.2%"

---

### Card 8: HD1
- **Label**: "HD1"
- **Descrição**: Handover até 1 dia - % de horas com prazo CD ≤ 1
- **Fórmula**:
```javascript
const hd1 = calculateWeightedShare(rows, (row) => Number(row.prazoCd) <= 1);
```
- **Formato**: X.X%

---

### Card 9: HD2
- **Label**: "HD2"
- **Descrição**: Handover até 2 dias - % de horas com prazo CD ≤ 2
- **Fórmula**:
```javascript
const hd2 = calculateWeightedShare(rows, (row) => Number(row.prazoCd) <= 2);
```
- **Formato**: X.X%

---

## 📊 LINHA 4: ÍNDICE EXPRESS (3 cards)

### Card 10: D+0
- **Label**: "D+0"
- **Descrição**: Delivery Day 0 - % de horas com prazo Cliente = 0
- **Fórmula**:
```javascript
const d0 = calculateWeightedShare(rows, (row) => Number(row.prazoCliente) === 0);
```
- **Formato**: X.X%

---

### Card 11: D+1
- **Label**: "D+1"
- **Descrição**: Delivery até 1 dia - % de horas com prazo Cliente ≤ 1
- **Fórmula**:
```javascript
const d1 = calculateWeightedShare(rows, (row) => Number(row.prazoCliente) <= 1);
```
- **Formato**: X.X%

---

### Card 12: D+2
- **Label**: "D+2"
- **Descrição**: Delivery até 2 dias - % de horas com prazo Cliente ≤ 2
- **Fórmula**:
```javascript
const d2 = calculateWeightedShare(rows, (row) => Number(row.prazoCliente) <= 2);
```
- **Formato**: X.X%

---

## 📊 LINHA 5: DISTRIBUIÇÃO (6 cards)

### Card 13: CDs Únicos
- **Label**: "CDs únicos"
- **Fórmula**:
```javascript
const uniqueCds = new Set(rows.map(r => r.cd)).size;
```
- **Formato**: Número inteiro

---

### Card 14: Modais Únicos
- **Label**: "Modais únicos"
- **Fórmula**:
```javascript
const uniqueModals = new Set(rows.map(r => r.modal)).size;
```
- **Formato**: Número inteiro

---

### Card 15: Geografias Únicas
- **Label**: "Geografias únicas"
- **Fórmula**:
```javascript
const uniqueGeographies = new Set(rows.map(r => r.geography)).size;
```
- **Formato**: Número inteiro

---

### Card 16: Localizações Comerciais
- **Label**: "Loc. Comerciais"
- **Fórmula**:
```javascript
const uniqueLocations = new Set(rows.map(r => r.commercialLocation)).size;
```
- **Formato**: Número inteiro

---

### Card 17: Sem Horário
- **Label**: "Sem horário"
- **Descrição**: Linhas onde horarioInicial é '-' (ausente)
- **Fórmula**:
```javascript
const withoutHours = rows.filter(r => r.horarioInicial === '-').length;
```
- **Formato**: Número inteiro

---

### Card 18: Expressos Simples
- **Label**: "Expressos (%)" ou "Expressos (D0-D2)"
- **Descrição**: % simples de linhas (NÃO ponderado) com prazoCliente ≤ 2
- **Fórmula**:
```javascript
const expressoPercentSimple = (rows.filter(r => Number(r.prazoCliente) <= 2).length / rows.length * 100).toFixed(1);
```
- **Formato**: X.X%
- **Nota**: Isto é diferente de D+2 (que é ponderado)

---

## 📊 LINHA 6: EXTRAS (Opcionais - do Lovable)

### Card 19: Prazo Máximo Cliente (NOVO)
- **Label**: "Prazo máximo Cliente"
- **Fórmula**:
```javascript
const maxClient = Math.max(...rows.map(r => Number(r.prazoCliente) || 0));
```
- **Formato**: Número inteiro

---

### Card 20: Prazo Mínimo Cliente (NOVO)
- **Label**: "Prazo mínimo Cliente"
- **Fórmula**:
```javascript
const minClient = Math.min(...rows.map(r => Number(r.prazoCliente) || 0));
```
- **Formato**: Número inteiro

---

### Card 21: Prazo Máximo CD (SUGESTÃO)
- **Label**: "Prazo máximo CD"
- **Fórmula**:
```javascript
const maxCd = Math.max(...rows.map(r => Number(r.prazoCd) || 0));
```
- **Formato**: Número inteiro

---

## 🎨 LAYOUT GRID RECOMENDADO

```
┌─────────────────────────────────────────────────────────────┐
│                 Resultado do Cálculo                         │
├─────────────────────────────────────────────────────────────┤
│  Linha 1: Base (3 cards)                                    │
│  [Rotas] [Linhas] [Horas Ofertadas]                        │
│                                                              │
│  Linha 2: Prazos Médios (3 cards)                           │
│  [Prazo CD] [Prazo TR] [Prazo Cliente]                     │
│                                                              │
│  Linha 3: Índice HD (3 cards)                               │
│  [HD0] [HD1] [HD2]                                          │
│                                                              │
│  Linha 4: Índice Express (3 cards)                          │
│  [D+0] [D+1] [D+2]                                          │
│                                                              │
│  Linha 5: Distribuição (6 cards)                            │
│  [CDs] [Modais] [Geografias] [Loc.Com] [SemHorario] [Expr] │
│                                                              │
│  [TABELA DE RESULTADOS]                                     │
└─────────────────────────────────────────────────────────────┘
```

**Responsividade**:
- Mobile: 1-2 colunas
- Tablet: 3 colunas
- Desktop: 3-6 colunas conforme a linha

---

## ⚠️ PONTOS CRÍTICOS

### 1. CONSOLIDAÇÃO é OBRIGATÓRIA
- Sem `getConsolidatedRows()`, as métricas ponderadas ficarão incorretas
- A consolidação remove duplicatas que podem aparecer em dados brutos

### 2. DIFERENÇA: Simples vs. Ponderado
- **Simples**: `rows.filter(...).length / rows.length`
  - Exemplo: Card 18 "Expressos (%)"
  
- **Ponderado**: `matchingHours / totalOfferHours`
  - Exemplo: Cards 7-12 (HD0-D2)

### 3. FORMATAÇÃO LOCALES
Use `toLocaleString('pt-BR')` para:
- Separador de milhar: "1.234"
- Separador decimal: "1,82"

### 4. VALORES INVÁLIDOS
- Se `totalOfferHours === 0`: retornar 0 (não Infinity ou NaN)
- Se array vazio: usar `Math.max(...[]) = -Infinity` → tratar como 0

### 5. NOME DOS CAMPOS
Verificar no response do backend se são:
- `prazoCd` ou `prazo_cd`
- `prazoCliente` ou `prazo_cliente`
- `horarioInicial` ou `horario_inicial`
- Normalizar se necessário (camelCase vs snake_case)

---

## 🧪 TESTES SUGERIDOS

```javascript
// Test 1: Consolidação
const test1 = getConsolidatedRows(rows);
console.assert(test1.length <= rows.length, "Consolidação não deve aumentar linhas");

// Test 2: Horas ofertadas
const test2 = getOfferHours({ horarioInicial: '10', horarioFinal: '20', segunda: 'OK', terca: 'OK' });
console.assert(test2 === 20, "Deve calcular 10 horas × 2 dias");

// Test 3: Percentuais
const test3 = calculateWeightedShare(rows, () => true);
console.assert(test3 > 0 && test3 <= 100, "Percentual deve estar entre 0-100");

// Test 4: Médias ponderadas
const test4 = calculateWeightedAverage(rows, 'prazoCd');
console.assert(test4 >= 0, "Média não pode ser negativa");
```

---

## 📥 PARA ENVIAR AO LOVABLE

**Prompt sugerido:**

> "Preciso que implemente exatamente 18 cards de métricas (6 linhas × 3 cards cada) após calcular prazos.
> 
> **Obrigatório implementar estas funções antes:**
> - countOkDays(row)
> - getOfferHours(row)  
> - getMetricsGroupKey(row)
> - getConsolidatedRows(rows)
> - calculateWeightedShare(rows, predicate)
> - calculateWeightedAverage(rows, field)
> 
> **Depois usar as fórmulas deste documento para cada card (ver seção LINHA 1-5).**
> 
> Grid: 3-3-3-3-6 cards (Desktop). Responsivo para mobile (1-2 colunas).
> 
> Formatar: Inteiros com separador, Decimais pt-BR, Percentuais com "X.X%"
> 
> Ver arquivo: METRICAS_IMPLEMENTACAO_CORRETA.md (seções LINHA 1-5)"

---

## 📝 Versão
- **v1.0** - 21/04/2026
- **Baseado em**: backend/public/index.html (implementação original funcionando)
- **Status**: Pronto para implementação 100%

