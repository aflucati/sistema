import { Link } from "react-router-dom";
import { Clock, Save, Upload, Search, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const tasks = [
  {
    to: "/gestao-prazos",
    icon: Clock,
    title: "Gestão de Prazos",
    description: "Calcule prazos a partir do planejamento logístico ou preenchimento manual.",
  },
  {
    to: "/salvar-padrao",
    icon: Save,
    title: "Salvar Padrão Vigente",
    description: "Salve um novo prazo padrão com vigência no sistema.",
  },
  {
    to: "/importar-ajuste",
    icon: Upload,
    title: "Importar Ajuste Pontual",
    description: "Importe ajustes temporários para feriados, paralisações ou exceções.",
  },
  {
    to: "/consulta",
    icon: Search,
    title: "Consulta",
    description: "Consulte planejamento e prazo vigente em qualquer data.",
  },
  {
    to: "/ajuda",
    icon: HelpCircle,
    title: "Ajuda",
    description: "Documentação completa, glossário e perguntas frequentes.",
  },
];

const steps = [
  { num: 1, text: "Monte ou importe o planejamento" },
  { num: 2, text: "Valide o cálculo" },
  { num: 3, text: "Salve como padrão ou ajuste pontual" },
  { num: 4, text: "Consulte o histórico e a vigência" },
];

export default function HomePage() {
  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Gestão de Prazos Logísticos</h1>
        <p className="page-subtitle">
          Planeje, calcule e gerencie prazos de entrega de forma centralizada.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tasks.map((task) => (
          <Link key={task.to} to={task.to} className="card-task group">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <task.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{task.description}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" className="text-primary text-xs gap-1 px-0 hover:bg-transparent hover:text-primary/80">
                Acessar <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="section-title">Fluxo recomendado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                {step.num}
              </div>
              <p className="text-sm text-foreground leading-snug pt-0.5">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
