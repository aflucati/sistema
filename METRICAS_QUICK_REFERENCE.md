# 🚀 Quick Reference - Cálculos de Métricas

## GestaoPrazosPage - 12 Cards (Após Calcular Prazos)

| # | Card | Fórmula | Formato |
|---|------|---------|---------|
| 1 | Linhas | `resultados.length` | Inteiro |
| 2 | Prazo médio Cliente | `(resultados.reduce((sum,r)=>sum+(r.prazoCliente\|\|0),0)/resultados.length).toFixed(2)` | 2 decimais |
| 3 | Prazo médio CD | `(resultados.reduce((sum,r)=>sum+(r.prazoCd\|\|0),0)/resultados.length).toFixed(2)` | 2 decimais |
| 4 | Prazo médio TR | `(resultados.reduce((sum,r)=>sum+(r.prazoTr\|\|0),0)/resultados.length).toFixed(2)` | 2 decimais |
| 5 | Prazo máximo Cliente | `Math.max(...resultados.map(r=>r.prazoCliente\|\|0))` | Inteiro |
| 6 | Prazo mínimo Cliente | `Math.min(...resultados.map(r=>r.prazoCliente\|\|0))` | Inteiro |
| 7 | CDs únicos | `new Set(resultados.map(r=>r.cd)).size` | Inteiro |
| 8 | Modais únicos | `new Set(resultados.map(r=>r.modal)).size` | Inteiro |
| 9 | Geografias únicas | `new Set(resultados.map(r=>r.geography)).size` | Inteiro |
| 10 | Loc. Comerciais | `new Set(resultados.map(r=>r.commercialLocation)).size` | Inteiro |
| 11 | Sem horário | `resultados.filter(r=>r.horarioInicial==='-').length` | Inteiro |
| 12 | Expressos (D0-D2) | `(resultados.filter(r=>r.prazoCliente<=2).length/resultados.length*100).toFixed(1)+'%'` | X.X% |

---

## ConsultaPage - 4 Cards (Consulta Vigente)

| # | Card | Fórmula | Formato |
|---|------|---------|---------|
| 1 | Rotas vigentes | `deadlinesList.length \|\| 0` | Inteiro |
| 2 | Prazo médio CD | `(deadlinesList.reduce((sum,r)=>sum+(r.prazoCd\|\|0),0)/(deadlinesList.length\|\|1)).toFixed(1)` | 1 decimal |
| 3 | Prazo médio TR | `(deadlinesList.reduce((sum,r)=>sum+(r.prazoTr\|\|0),0)/(deadlinesList.length\|\|1)).toFixed(1)` | 1 decimal |
| 4 | Prazo médio Cliente | `(deadlinesList.reduce((sum,r)=>sum+(r.prazoCliente\|\|0),0)/(deadlinesList.length\|\|1)).toFixed(1)` | 1 decimal |

---

## Estrutura de Dados

**resultados**: Array com objetos contendo:
```
{ cd, modal, geography, commercialLocation, locality, 
  prazoCd, prazoTr, prazoCliente, horarioInicial, ... }
```

**deadlinesList**: Array com objetos do BD (cuidar com snake_case):
```
{ cd, modal, prazoCd (ou prazo_cd), prazoTr (ou prazo_tr), prazoCliente (ou prazo_cliente), ... }
```

---

## Cópia para Lovable

Use este documento como base para instruir a IA:

> "Preciso de 12 cards de métricas depois que o usuário calcula prazos. Cada card mostra um indicador diferente. 
> 
> A fórmula de cada card é:
> - Card 1 (Linhas): resultados.length
> - Card 2 (Prazo médio Cliente): média dos prazoCliente
> - Card 3 (Prazo médio CD): média dos prazoCd
> - ... [copiar tabela acima]
> 
> Todos em um grid de 2 colunas mobile, 3 tablet, 6 desktop. Ver documento METRICAS_CALCULOS.md para detalhes completos."

