import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const sections = [
  { id: "o-que-e", title: "O que é o sistema", content: "O sistema de Gestão de Prazos Logísticos é uma ferramenta operacional para planejamento, cálculo e gestão de prazos de entrega da Magalog. Ele centraliza a definição de prazos por rota, modal e geografia, permitindo controle total sobre vigências e ajustes pontuais." },
  { id: "fluxo", title: "Fluxo de trabalho recomendado", content: "1. Monte ou importe o planejamento logístico na tela de Gestão de Prazos.\n2. Valide o cálculo gerado pelo sistema.\n3. Salve como padrão vigente ou aplique como ajuste pontual.\n4. Consulte o histórico e a vigência atual a qualquer momento." },
  { id: "conceitos", title: "Conceitos principais", content: "O sistema trabalha com os conceitos de Planejamento Logístico (definição de rotas, modais e eventos de carga), Cálculo de Prazos (processamento automático dos prazos CD, TR e Cliente), Padrão Vigente (configuração ativa que define os prazos em produção) e Ajuste Pontual (modificação temporária para exceções operacionais)." },
  { id: "planejamento", title: "Como montar o planejamento", content: "Acesse a tela de Gestão de Prazos e utilize a importação da planilha padrão do PCP ou preencha manualmente os campos: CD, Modal, Geografia, Localização Comercial, e configure os eventos de carga com dia, horário de corte, regra de entrega e frequência." },
  { id: "calcular", title: "Como calcular os prazos", content: "Após preencher os dados do planejamento (via importação ou modo manual), clique em 'Calcular Prazos'. O sistema processará as informações e exibirá os resultados em cards de resumo e uma tabela detalhada com os prazos por rota." },
  { id: "salvar-padrao", title: "Como salvar um padrão vigente", content: "Na tela Salvar Padrão Vigente, defina o tipo de vigência, datas de início e fim, tipo e escopo do ajuste, e adicione observações. Ao confirmar, os prazos calculados serão salvos como o padrão ativo do sistema." },
  { id: "ajuste-pontual", title: "Como subir um ajuste pontual", content: "Na tela Importar Ajuste Pontual, faça o upload da planilha validada e defina os dados do ajuste temporário. Use para feriados, paralisações, mudanças temporárias ou exceções operacionais." },
  { id: "consulta-vigencia", title: "Como consultar vigência", content: "Na tela de Consulta, defina a data de referência e os filtros desejados. Você pode consultar o planejamento vigente, prazo vigente, histórico de alterações e comparar versões." },
  { id: "campos", title: "Significado dos campos", content: "" },
  { id: "glossario", title: "Glossário operacional", content: "" },
  { id: "faq", title: "Perguntas frequentes", content: "" },
];

const camposGlossario = [
  { termo: "Prazo CD", def: "Tempo de processamento no Centro de Distribuição, desde o recebimento do pedido até a expedição." },
  { termo: "Prazo TR", def: "Tempo de transporte, do CD até o ponto de entrega ou loja." },
  { termo: "Prazo Cliente", def: "Prazo total percebido pelo cliente final, soma de CD + TR + processamento." },
  { termo: "Horário de Corte", def: "Limite de horário para que um pedido seja processado no mesmo dia de carga." },
  { termo: "Frequência do Evento", def: "Periodicidade em que o evento de carga ocorre: semanal, quinzenal, D0, etc." },
  { termo: "Dia Ofertado", def: "Dia de entrega que será apresentado ao cliente no momento da compra." },
  { termo: "Dia da Entrega Real", def: "Dia efetivo em que a entrega será realizada pela operação logística." },
  { termo: "Rota", def: "Caminho logístico definido por CD + Localização Comercial + Geografia." },
  { termo: "Geografia", def: "Classificação geográfica do destino: Capital, Interior, Shopping, Virtual, CD/XD." },
  { termo: "Modal", def: "Tipo de transporte utilizado: RODO, COURIER, RODO+COURIER, DESTINO LOJA ou RETIRA." },
  { termo: "Padrão Vigente", def: "Configuração de prazos atualmente ativa no sistema de produção." },
  { termo: "Ajuste Pontual", def: "Modificação temporária de prazos para um período específico (feriados, exceções)." },
  { termo: "Vigência", def: "Período de validade de uma configuração de prazos." },
  { termo: "Alinhamento", def: "Processo de sincronização entre o planejamento logístico e os prazos publicados." },
  { termo: "Plano de Transporte", def: "Definição da capacidade e frequência de transporte, semanal ou diário." },
];

const faqs = [
  { q: "Posso ter mais de um padrão vigente ao mesmo tempo?", a: "Não. Apenas um padrão vigente fica ativo por vez. Ajustes pontuais têm prioridade sobre o padrão durante sua vigência." },
  { q: "O que acontece quando um ajuste pontual expira?", a: "O sistema volta a utilizar automaticamente o padrão vigente." },
  { q: "Posso editar um padrão já salvo?", a: "Não diretamente. É necessário criar um novo padrão que substituirá o anterior." },
  { q: "Qual o formato aceito para importação?", a: "Planilhas nos formatos .xlsx, .xls ou .csv seguindo o padrão do PCP." },
];

export default function AjudaPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("o-que-e");

  const filteredSections = sections.filter(
    (s) => s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Central de Ajuda</h1>
        <p className="page-subtitle">Documentação completa do sistema de Gestão de Prazos Logísticos.</p>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar na documentação..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Menu lateral */}
        <div className="md:w-56 flex-shrink-0">
          <nav className="sticky top-24 space-y-0.5">
            {filteredSections.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); }}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 space-y-6">
          {filteredSections.map((s) => (
            <div key={s.id} id={s.id} className="bg-card rounded-lg border border-border p-5">
              <h2 className="section-title">{s.title}</h2>
              {s.id === "campos" || s.id === "glossario" ? (
                <div className="space-y-2">
                  {camposGlossario.map((c) => (
                    <div key={c.termo} className="flex flex-col sm:flex-row sm:gap-3 py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium text-foreground min-w-[160px]">{c.termo}</span>
                      <span className="text-sm text-muted-foreground">{c.def}</span>
                    </div>
                  ))}
                </div>
              ) : s.id === "faq" ? (
                <div className="space-y-3">
                  {faqs.map((f) => (
                    <div key={f.q} className="border border-border rounded-md p-4">
                      <p className="text-sm font-medium text-foreground mb-1">{f.q}</p>
                      <p className="text-sm text-muted-foreground">{f.a}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
