# 📊 Especificação de Cálculos de Métricas - Sistema de Gestão de Prazos

## Objetivo
Este documento detalha os cálculos exatos de cada card de métrica no sistema de gestão de prazos, para replicação no novo frontend desenvolvido no Lovable.

---

## 1️⃣ PÁGINA: GestaoPrazosPage - Cards de Resultado do Cálculo

### 📍 Seção: "Resultado do Cálculo"
Exibida quando `showResults === true && resultados.length > 0`

---

### **Linha 1: Prazos e Contagens Básicas** (6 Cards)

#### Card 1: Linhas
- **Label**: "Linhas"
- **Valor**: `resultados.length`
- **Tipo**: Número inteiro
- **Descrição**: Total de linhas calculadas

**Fórmula JavaScript**:
```javascript
resultados.length
```

---

#### Card 2: Prazo Médio Cliente
- **Label**: "Prazo médio Cliente"
- **Valor**: Média aritmética dos `prazoCliente`
- **Formato**: 2 casas decimais
- **Descrição**: Soma de todos os `prazoCliente` dividido pela quantidade de linhas

**Fórmula JavaScript**:
```javascript
(resultados.reduce((sum, r) => sum + (r.prazoCliente || 0), 0) / resultados.length).toFixed(2)
```

**Explicação**:
- `reduce`: Soma todos os valores de `prazoCliente` (usa 0 se undefined)
- Divide pela quantidade de linhas
- `.toFixed(2)`: Formata para 2 casas decimais

---

#### Card 3: Prazo Médio CD
- **Label**: "Prazo médio CD"
- **Valor**: Média aritmética dos `prazoCd`
- **Formato**: 2 casas decimais

**Fórmula JavaScript**:
```javascript
(resultados.reduce((sum, r) => sum + (r.prazoCd || 0), 0) / resultados.length).toFixed(2)
```

**Explicação**: Idêntica ao Card 2, mas utiliza `prazoCd`

---

#### Card 4: Prazo Médio TR
- **Label**: "Prazo médio TR"
- **Valor**: Média aritmética dos `prazoTr`
- **Formato**: 2 casas decimais

**Fórmula JavaScript**:
```javascript
(resultados.reduce((sum, r) => sum + (r.prazoTr || 0), 0) / resultados.length).toFixed(2)
```

**Explicação**: Idêntica ao Card 2, mas utiliza `prazoTr`

---

#### Card 5: Prazo Máximo Cliente
- **Label**: "Prazo máximo Cliente"
- **Valor**: Valor máximo entre todos os `prazoCliente`
- **Formato**: Número inteiro

**Fórmula JavaScript**:
```javascript
Math.max(...resultados.map(r => r.prazoCliente || 0))
```

**Explicação**:
- `.map()`: Extrai todos os valores de `prazoCliente`
- `Math.max()`: Retorna o maior valor

---

#### Card 6: Prazo Mínimo Cliente
- **Label**: "Prazo mínimo Cliente"
- **Valor**: Valor mínimo entre todos os `prazoCliente`
- **Formato**: Número inteiro

**Fórmula JavaScript**:
```javascript
Math.min(...resultados.map(r => r.prazoCliente || 0))
```

**Explicação**: Idêntica ao Card 5, mas usando `Math.min()`

---

### **Linha 2: Unicidade e Indicadores de Distribuição** (6 Cards)

#### Card 7: CDs Únicos
- **Label**: "CDs únicos"
- **Valor**: Quantidade de valores únicos em `cd`
- **Formato**: Número inteiro

**Fórmula JavaScript**:
```javascript
new Set(resultados.map(r => r.cd)).size
```

**Explicação**:
- `.map()`: Extrai todos os valores de `cd`
- `Set`: Remove duplicatas
- `.size`: Retorna a quantidade de elementos únicos

---

#### Card 8: Modais Únicos
- **Label**: "Modais únicos"
- **Valor**: Quantidade de valores únicos em `modal`
- **Formato**: Número inteiro

**Fórmula JavaScript**:
```javascript
new Set(resultados.map(r => r.modal)).size
```

**Explicação**: Idêntica ao Card 7, mas utiliza `modal`

---

#### Card 9: Geografias Únicas
- **Label**: "Geografias únicas"
- **Valor**: Quantidade de valores únicos em `geography`
- **Formato**: Número inteiro

**Fórmula JavaScript**:
```javascript
new Set(resultados.map(r => r.geography)).size
```

**Explicação**: Idêntica ao Card 7, mas utiliza `geography`

---

#### Card 10: Localizações Comerciais Únicas
- **Label**: "Loc. Comerciais"
- **Valor**: Quantidade de valores únicos em `commercialLocation`
- **Formato**: Número inteiro

**Fórmula JavaScript**:
```javascript
new Set(resultados.map(r => r.commercialLocation)).size
```

**Explicação**: Idêntica ao Card 7, mas utiliza `commercialLocation`

---

#### Card 11: Sem Horário
- **Label**: "Sem horário"
- **Valor**: Quantidade de linhas onde `horarioInicial === '-'`
- **Formato**: Número inteiro

**Fórmula JavaScript**:
```javascript
resultados.filter(r => r.horarioInicial === '-').length
```

**Explicação**:
- `.filter()`: Seleciona apenas registros com `horarioInicial` igual a '-'
- `.length`: Conta quantos registros correspondem

---

#### Card 12: Expressos (D0-D2)
- **Label**: "Expressos (D0-D2)"
- **Valor**: Percentual de linhas onde `prazoCliente <= 2`
- **Formato**: X.X% (1 casa decimal + símbolo %)

**Fórmula JavaScript**:
```javascript
(resultados.filter(r => r.prazoCliente <= 2).length / resultados.length * 100).toFixed(1) + '%'
```

**Explicação**:
- `.filter()`: Seleciona registros com `prazoCliente` <= 2 (D0, D1, D2)
- `.length`: Quantidade de registros que atendem
- `/ resultados.length * 100`: Calcula a porcentagem
- `.toFixed(1)`: Formata para 1 casa decimal
- Adiciona símbolo '%'

---

## 2️⃣ PÁGINA: ConsultaPage - Cards de Resumo

### 📍 Seção: Cards acima das abas
Exibida quando `showResults === true`

---

#### Card 1: Rotas Vigentes
- **Label**: "Rotas vigentes"
- **Valor**: Quantidade de registros em `deadlinesList`
- **Formato**: Número inteiro
- **Falha-segura**: 0 se `deadlinesList` não existe ou está vazio

**Fórmula JavaScript**:
```javascript
deadlinesList.length || 0
```

---

#### Card 2: Prazo Médio CD
- **Label**: "Prazo médio CD"
- **Valor**: Média dos `prazoCd` (ou `prazo_cd` - verificar nomenclatura do BD)
- **Formato**: 1 casa decimal
- **Falha-segura**: Divide por 1 se `deadlinesList.length === 0`

**Fórmula JavaScript**:
```javascript
(deadlinesList.reduce((sum, r) => sum + (r.prazoCd || 0), 0) / (deadlinesList.length || 1)).toFixed(1)
```

**Nota importante**: O BD pode retornar `prazo_cd` (snake_case) ou `prazoCd` (camelCase). Use:
```javascript
(r.prazo_cd || r.prazoCd || 0)
```

---

#### Card 3: Prazo Médio TR
- **Label**: "Prazo médio TR"
- **Valor**: Média dos `prazoTr` (ou `prazo_tr`)
- **Formato**: 1 casa decimal
- **Falha-segura**: Divide por 1 se `deadlinesList.length === 0`

**Fórmula JavaScript**:
```javascript
(deadlinesList.reduce((sum, r) => sum + (r.prazoTr || 0), 0) / (deadlinesList.length || 1)).toFixed(1)
```

---

#### Card 4: Prazo Médio Cliente
- **Label**: "Prazo médio Cliente"
- **Valor**: Média dos `prazoCliente` (ou `prazo_cliente`)
- **Formato**: 1 casa decimal
- **Falha-segura**: Divide por 1 se `deadlinesList.length === 0`

**Fórmula JavaScript**:
```javascript
(deadlinesList.reduce((sum, r) => sum + (r.prazoCliente || 0), 0) / (deadlinesList.length || 1)).toFixed(1)
```

---

## 3️⃣ ESTRUTURA DOS DADOS

### Objeto `resultados` (GestaoPrazosPage)
Cada elemento contém:
```javascript
{
  cd: string,                    // CD da rota
  modal: string,                 // Tipo de modal
  geography: string,             // Geografia/região
  commercialLocation: string,    // Localização comercial
  locality: string,              // Localidade
  metodoCd: string,              // Método de cálculo CD
  prazoCd: number,               // Prazo em dias CD
  metodoTr: string,              // Método de cálculo TR
  prazoTr: number,               // Prazo em dias TR
  prazoCliente: number,          // Prazo em dias Cliente
  horarioInicial: string,        // "HH:MM" ou "-"
  horarioFinal: string,          // "HH:MM" ou "-"
  rotaFixa: string,              // "SIM" ou "NÃO"
  segunda: string,               // "OK" ou "NOOK"
  terca: string,                 // "OK" ou "NOOK"
  quarta: string,                // "OK" ou "NOOK"
  quinta: string,                // "OK" ou "NOOK"
  sexta: string,                 // "OK" ou "NOOK"
  sabado: string,                // "OK" ou "NOOK"
  domingo: string                // "OK" ou "NOOK"
}
```

### Objeto `deadlinesList` (ConsultaPage)
Pode vir com nomenclatura snake_case do BD:
```javascript
{
  cd: string,
  modal: string,
  comercialLocation: string,  // ou "localizacao_comercial"
  geography: string,           // ou "geografia"
  prazoCd: number,             // ou "prazo_cd"
  prazoTr: number,             // ou "prazo_tr"
  prazoCliente: number         // ou "prazo_cliente"
}
```

**Importante**: Normalizar nomes de propriedades se necessário (BD usa snake_case, frontend pode usar camelCase)

---

## 4️⃣ GRID LAYOUT

### GestaoPrazosPage
```
[Grid de 2 colunas em mobile, 3 em tablet, 6 em desktop]

Linha 1 (6 cards):
- Linhas | Prazo médio Cliente | Prazo médio CD | Prazo médio TR | Prazo máximo | Prazo mínimo

Linha 2 (6 cards):
- CDs únicos | Modais | Geografias | Loc. Comerciais | Sem horário | Expressos %
```

### ConsultaPage
```
[Grid de 2 colunas em mobile, 4 em desktop]

1 Linha (4 cards):
- Rotas vigentes | Prazo médio CD | Prazo médio TR | Prazo médio Cliente
```

---

## 5️⃣ NOTAS IMPORTANTES

### ⚠️ Edge Cases e Validações

1. **Divisão por Zero**
   - Se `resultados.length === 0` nas médias, usar `|| 1` como divisor de segurança
   - Isso evita `NaN` em tela

2. **Valores Undefined**
   - Sempre usar `|| 0` para valores faltantes
   - Exemplo: `r.prazoCliente || 0`

3. **Formatação de Números**
   - `.toFixed(2)`: 2 casas decimais para prazos
   - `.toFixed(1)`: 1 casa decimal para percentuais e médias gerais
   - `Math.max()` / `Math.min()` retorna inteiro (sem formatação)

4. **Nomes de Campos**
   - BD pode retornar `prazo_cd` ou `prazoCd`
   - Normalizar em hook/componente se necessário

5. **Horário Inicial**
   - O valor '-' (string, não undefined) indica ausência de horário
   - Fazer comparação exata: `=== '-'`

6. **Percentual**
   - Só aplicar símbolo '%' na exibição, não no cálculo
   - Formato: "X.X%" (ex: "85.5%")

---

## 6️⃣ CHECKLIST DE IMPLEMENTAÇÃO

Para cada card, verificar:

- [ ] Label correto
- [ ] Cálculo correto (fórmula exata)
- [ ] Formatação de casas decimais (2 ou 1)
- [ ] Tratamento de valores undefined (`|| 0`)
- [ ] Tratamento de divisão por zero (`|| 1`)
- [ ] Grid layout responsivo
- [ ] Cor/estilo consistente com design
- [ ] Hover effects (se aplicável)
- [ ] Dados vindo da API correta (`resultados` ou `deadlinesList`)

---

## 7️⃣ REFERÊNCIAS

### Endpoints da API
- `POST /upload` → Retorna `{ rows: [], summary: {} }`
- `POST /calculate` → Retorna `{ rows: [] }`
- `GET /db/query` → Retorna `[]` de deadlines (ConsultaPage)

### Arquivo Original (Backup)
- `frontend-old/src/pages/App.tsx` - Implementação anterior com cards funcionando
- `frontend-old/src/App.css` - Estilos CSS dos cards

---

## 8️⃣ EXEMPLO DE IMPLEMENTAÇÃO EM REACT

### GestaoPrazosPage - Snippet
```jsx
{/* Cards Linha 1 */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
  <div className="stat-card">
    <div className="stat-card-value">{resultados.length}</div>
    <div className="stat-card-label">Linhas</div>
  </div>
  
  <div className="stat-card">
    <div className="stat-card-value">
      {(resultados.reduce((sum, r) => sum + (r.prazoCliente || 0), 0) / resultados.length).toFixed(2)}
    </div>
    <div className="stat-card-label">Prazo médio Cliente</div>
  </div>
  
  {/* ... outros 4 cards */}
</div>

{/* Cards Linha 2 */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
  <div className="stat-card">
    <div className="stat-card-value">{new Set(resultados.map(r => r.cd)).size}</div>
    <div className="stat-card-label">CDs únicos</div>
  </div>
  
  {/* ... outros 5 cards */}
</div>
```

### ConsultaPage - Snippet
```jsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
  <div className="stat-card">
    <div className="stat-card-value">{deadlinesList.length || 0}</div>
    <div className="stat-card-label">Rotas vigentes</div>
  </div>
  
  <div className="stat-card">
    <div className="stat-card-value">
      {(deadlinesList.reduce((sum, r) => sum + (r.prazoCd || 0), 0) / (deadlinesList.length || 1)).toFixed(1)}
    </div>
    <div className="stat-card-label">Prazo médio CD</div>
  </div>
  
  {/* ... outros 2 cards */}
</div>
```

---

## Versão do Documento
- **v1.0** - 21/04/2026
- **Função**: Especificação exata para replicação no Lovable
- **Status**: Pronto para implementação

---

