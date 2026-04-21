import { useState, useRef } from "react";
import { Upload, Plus, Trash2, FileSpreadsheet, Download, Copy, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCalculateDeadlines } from "@/hooks/api/useCalculateDeadlines";
import { exportToXLSX, exportToCSV, exportToHTML, copyToClipboard } from "@/lib/exporters";

const modais = [
  { value: "RODO", label: "RODO", tooltip: "PESADOS P/P" },
  { value: "COURIER", label: "COURIER", tooltip: "LEVES P/P" },
  { value: "RODO_COURIER", label: "RODO+COURIER", tooltip: "P/P PESADOS & RODO P" },
  { value: "DESTINO_LOJA", label: "DESTINO LOJA", tooltip: "RETIRAS + ABASTECIMENTO" },
  { value: "RETIRA", label: "RETIRA", tooltip: "RLE + RET + RL3" },
];

const geografiaLojaOptions = ["Convencional", "Shopping", "Virtual", "CD/ XD"];
const frequencias = ["SEMANAL", "QUINZENAL", "PROXIMA SEMANA", "PROXIMA QUINZENA", "D0"];
const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

interface Evento {
  id: number;
  diaCarga: string;
  horarioCorte: string;
  regraEntrega: string;
  frequencia: string;
  planoTransporteDia: string;
}

export default function GestaoPrazosPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: calculateDeadlines, isPending: isLoading, error: calculationError } = useCalculateDeadlines();

  // Estados de formulário
  const [modalSelecionado, setModalSelecionado] = useState("");
  const [planoTipo, setPlanoTipo] = useState<"semanal" | "diario">("semanal");
  const [eventos, setEventos] = useState<Evento[]>([
    { id: 1, diaCarga: "", horarioCorte: "", regraEntrega: "", frequencia: "", planoTransporteDia: "" },
  ]);
  const [cd, setCd] = useState("");
  const [geography, setGeography] = useState("");
  const [commercialLocation, setCommercialLocation] = useState("");
  const [locality, setLocality] = useState("");
  const [rota, setRota] = useState("");
  
  // Estados de resultado
  const [resultados, setResultados] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const isLojaModal = modalSelecionado === "DESTINO_LOJA" || modalSelecionado === "RETIRA";

  const addEvento = () => {
    setEventos([...eventos, { id: Date.now(), diaCarga: "", horarioCorte: "", regraEntrega: "", frequencia: "", planoTransporteDia: "" }]);
  };

  const removeEvento = (id: number) => {
    if (eventos.length > 1) setEventos(eventos.filter((e) => e.id !== id));
  };

  const updateEvento = (id: number, field: keyof Evento, value: string) => {
    setEventos(eventos.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  // Handle file upload via input
  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    calculateDeadlines(
      { file },
      {
        onSuccess: (data) => {
          setResultados(data.rows || []);
          setShowResults(true);
          toast({
            title: "Sucesso",
            description: `${data.rows?.length || 0} prazos calculados`,
          });
        },
        onError: (err: any) => {
          toast({
            title: "Erro",
            description: err.response?.data?.message || "Erro ao processar arquivo",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Calcular prazos em modo manual
  const handleCalcularManual = () => {
    if (!modalSelecionado) {
      toast({ title: "Erro", description: "Selecione um modal", variant: "destructive" });
      return;
    }
    if (!geography) {
      toast({ title: "Erro", description: "Preencha a geografia", variant: "destructive" });
      return;
    }
    if (!commercialLocation) {
      toast({ title: "Erro", description: "Preencha a localização comercial", variant: "destructive" });
      return;
    }
    if (eventos.some(e => !e.diaCarga || !e.horarioCorte)) {
      toast({ title: "Erro", description: "Complete todos os eventos de carga", variant: "destructive" });
      return;
    }

    // Formatar eventos para envio ao backend
    const formattedEvents = eventos.map(e => ({
      day: diasSemana.indexOf(e.diaCarga),
      hourCut: parseInt(e.horarioCorte.split(":")[0]) || 0,
      deliveryDay: parseInt(e.regraEntrega.match(/\d+/)?.[0] || "0") || 0,
    }));

    calculateDeadlines(
      {
        routes: [{
          modal: modalSelecionado,
          geography,
          commercialLocation,
          events: formattedEvents,
        }],
      },
      {
        onSuccess: (data) => {
          setResultados(data.rows || []);
          setShowResults(true);
          toast({
            title: "Sucesso",
            description: `${data.rows?.length || 0} prazos calculados`,
          });
        },
        onError: (err: any) => {
          toast({
            title: "Erro",
            description: err.response?.data?.message || "Erro ao calcular prazos",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Gestão de Prazos</h1>
        <p className="page-subtitle">Calcule prazos a partir do upload do planejamento ou preenchimento manual.</p>
      </div>

      {calculationError && (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {calculationError instanceof Error ? calculationError.message : "Erro na requisição"}
          </AlertDescription>
        </Alert>
      )}

      {/* MÓDULO 1: Importação */}
      <div className="bg-card rounded-lg border border-border p-5 mb-5">
        <h2 className="section-title">Importação do Planejamento</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Importe a planilha padrão do PCP para gerar o cálculo dos prazos.
        </p>
        <div 
          className="upload-zone cursor-pointer hover:bg-muted/50 transition"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Arraste e solte, clique para selecionar ou cole o arquivo
          </p>
          <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="mt-4 flex items-center gap-3">
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {isLoading ? "Processando..." : "Importar"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {uploadedFile ? `Arquivo: ${uploadedFile.name}` : "Nenhum arquivo selecionado"}
          </span>
        </div>
      </div>

      {/* MÓDULO 2: Modo Manual */}
      <div className="bg-card rounded-lg border border-border p-5 mb-5">
        <h2 className="section-title">Modo Manual</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">CD</Label>
            <Input type="number" placeholder="Ex: 1234" maxLength={4} className="mt-1" value={cd} onChange={(e) => setCd(e.target.value)} />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <Label className="text-xs mb-2 block">Modal</Label>
            <div className="flex flex-wrap gap-2">
              {modais.map((m) => (
                <Tooltip key={m.value}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setModalSelecionado(m.value)}
                      className={`chip ${modalSelecionado === m.value ? "chip-active" : "chip-inactive"}`}
                    >
                      {m.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">{m.tooltip}</p></TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Geografia</Label>
            {isLojaModal ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {geografiaLojaOptions.map((g) => (
                  <button key={g} className="chip chip-inactive text-xs">{g}</button>
                ))}
              </div>
            ) : (
              <Input placeholder="Ex: Capital, Interior" className="mt-1" value={geography} onChange={(e) => setGeography(e.target.value)} />
            )}
          </div>

          <div>
            <Label className="text-xs">Localização Comercial</Label>
            <Input placeholder="Ex: São Paulo" className="mt-1" value={commercialLocation} onChange={(e) => setCommercialLocation(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Localidade <span className="text-muted-foreground">(Opcional)</span></Label>
            <Input placeholder="Ex: Zona Sul" className="mt-1" value={locality} onChange={(e) => setLocality(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Rota <span className="text-muted-foreground">(Opcional)</span></Label>
            <Input placeholder="Pode ser preenchido automaticamente" className="mt-1" value={rota} onChange={(e) => setRota(e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-0.5">Auto: CD + Loc. Comercial + Geografia</p>
          </div>
        </div>

        {/* Plano de Transporte */}
        <div className="mt-5 pt-4 border-t border-border">
          <Label className="text-xs mb-2 block">Plano de Transporte</Label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setPlanoTipo("semanal")}
              className={`chip text-xs ${planoTipo === "semanal" ? "chip-active" : "chip-inactive"}`}
            >
              Semanal
            </button>
            <button
              onClick={() => setPlanoTipo("diario")}
              className={`chip text-xs ${planoTipo === "diario" ? "chip-active" : "chip-inactive"}`}
            >
              Diário
            </button>
          </div>
          {planoTipo === "semanal" && (
            <Input placeholder="Plano de transporte semanal" className="max-w-sm" />
          )}
        </div>
      </div>

      {/* MÓDULO 3: Eventos de Carga */}
      <div className="bg-card rounded-lg border border-border p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Eventos de Carga</h2>
          <Button variant="outline" size="sm" onClick={addEvento} className="text-xs gap-1">
            <Plus className="h-3 w-3" /> Adicionar evento
          </Button>
        </div>

        <div className="space-y-3">
          {eventos.map((ev, idx) => (
            <div key={ev.id} className="border border-border rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Evento {idx + 1}</span>
                {eventos.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeEvento(ev.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Dia da Carga</Label>
                  <Select value={ev.diaCarga} onValueChange={(v) => updateEvento(ev.id, "diaCarga", v)}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{diasSemana.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Horário de Corte</Label>
                  <Input type="time" className="mt-1" value={ev.horarioCorte} onChange={(e) => updateEvento(ev.id, "horarioCorte", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Regra de Entrega</Label>
                  <Input className="mt-1 text-xs" placeholder="Ex: D+2" value={ev.regraEntrega} onChange={(e) => updateEvento(ev.id, "regraEntrega", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Frequência</Label>
                  <Select value={ev.frequencia} onValueChange={(v) => updateEvento(ev.id, "frequencia", v)}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{frequencias.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {planoTipo === "diario" && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Plano de Transporte do Dia</Label>
                    <Input className="mt-1 text-xs" placeholder="Plano do dia" value={ev.planoTransporteDia} onChange={(e) => updateEvento(ev.id, "planoTransporteDia", e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Button onClick={handleCalcularManual} disabled={isLoading}>
            {isLoading ? "Calculando..." : "Calcular Prazos"}
          </Button>
        </div>
      </div>

      {/* MÓDULO 4: Resultado */}
      {showResults && resultados.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5 mb-5">
          <h2 className="section-title">Resultado do Cálculo</h2>

          <div className="space-y-3 mb-5">
            {/* Indicadores - Linha 1 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="stat-card">
                <div className="stat-card-value">{resultados.length}</div>
                <div className="stat-card-label">Linhas</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{(resultados.reduce((sum, r) => sum + (r.prazoCliente || 0), 0) / resultados.length).toFixed(2)}</div>
                <div className="stat-card-label">Prazo médio Cliente</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{(resultados.reduce((sum, r) => sum + (r.prazoCd || 0), 0) / resultados.length).toFixed(2)}</div>
                <div className="stat-card-label">Prazo médio CD</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{(resultados.reduce((sum, r) => sum + (r.prazoTr || 0), 0) / resultados.length).toFixed(2)}</div>
                <div className="stat-card-label">Prazo médio TR</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{Math.max(...resultados.map(r => r.prazoCliente || 0))}</div>
                <div className="stat-card-label">Prazo máximo Cliente</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{Math.min(...resultados.map(r => r.prazoCliente || 0))}</div>
                <div className="stat-card-label">Prazo mínimo Cliente</div>
              </div>
            </div>
            {/* Indicadores - Linha 2 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="stat-card">
                <div className="stat-card-value">{new Set(resultados.map(r => r.cd)).size}</div>
                <div className="stat-card-label">CDs únicos</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{new Set(resultados.map(r => r.modal)).size}</div>
                <div className="stat-card-label">Modais únicos</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{new Set(resultados.map(r => r.geography)).size}</div>
                <div className="stat-card-label">Geografias únicas</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{new Set(resultados.map(r => r.commercialLocation)).size}</div>
                <div className="stat-card-label">Loc. Comerciais</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{resultados.filter(r => r.horarioInicial === '-').length}</div>
                <div className="stat-card-label">Sem horário</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{(resultados.filter(r => r.prazoCliente <= 2).length / resultados.length * 100).toFixed(1)}%</div>
                <div className="stat-card-label">Expressos (D0-D2)</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CD</th>
                  <th>Modal</th>
                  <th>Geografia</th>
                  <th>Loc. Comercial</th>
                  <th>Localidade</th>
                  <th>Método CD</th>
                  <th>Prazo CD</th>
                  <th>Método TR</th>
                  <th>Prazo TR</th>
                  <th>Prazo Cliente</th>
                  <th>H. Inicial</th>
                  <th>H. Final</th>
                  <th>Seg</th>
                  <th>Ter</th>
                  <th>Qua</th>
                  <th>Qui</th>
                  <th>Sex</th>
                  <th>Sab</th>
                  <th>Dom</th>
                </tr>
              </thead>
              <tbody>
                {resultados.slice(0, 10).map((r, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{r.cd || "-"}</td>
                    <td>{r.modal || "-"}</td>
                    <td>{r.geography || "-"}</td>
                    <td>{r.commercialLocation || "-"}</td>
                    <td className="text-xs">{r.locality || "-"}</td>
                    <td className="text-xs">{r.metodoCd || "-"}</td>
                    <td className="text-center">{r.prazoCd || 0}</td>
                    <td className="text-xs">{r.metodoTr || "-"}</td>
                    <td className="text-center">{r.prazoTr || 0}</td>
                    <td className="text-center font-semibold">{r.prazoCliente || 0}</td>
                    <td className="text-center text-xs">{r.horarioInicial || "-"}</td>
                    <td className="text-center text-xs">{r.horarioFinal || "-"}</td>
                    <td className="text-center text-xs">{r.segunda || "-"}</td>
                    <td className="text-center text-xs">{r.terca || "-"}</td>
                    <td className="text-center text-xs">{r.quarta || "-"}</td>
                    <td className="text-center text-xs">{r.quinta || "-"}</td>
                    <td className="text-center text-xs">{r.sexta || "-"}</td>
                    <td className="text-center text-xs">{r.sabado || "-"}</td>
                    <td className="text-center text-xs">{r.domingo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{Math.min(10, resultados.length)} de {resultados.length} resultados</span>
            {resultados.length > 10 && (
              <span className="text-xs text-muted-foreground">... {resultados.length - 10} mais</span>
            )}
          </div>
        </div>
      )}

      {showResults && resultados.length === 0 && !isLoading && (
        <div className="bg-card rounded-lg border border-border p-5 mb-5">
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Nenhum resultado obtido. Verifique os dados e tente novamente.</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="bg-card rounded-lg border border-border p-5 mb-5">
          <div className="text-center py-8">
            <div className="inline-block animate-spin">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Calculando prazos...</p>
          </div>
        </div>
      )}

      {/* MÓDULO 5: Preview HTML */}
      {showResults && resultados.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="section-title">Exportar Resultado</h2>
          <p className="text-xs text-muted-foreground mb-4">Exporte os dados em diferentes formatos para análise ou armazenamento.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => exportToHTML(resultados, `resultado_prazos_${new Date().getTime()}.html`)}>
              <Download className="h-3 w-3" /> Exportar HTML
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => exportToXLSX(resultados, `resultado_prazos_${new Date().getTime()}.xlsx`)}>
              <FileSpreadsheet className="h-3 w-3" /> Exportar XLSX
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => exportToCSV(resultados, `resultado_prazos_${new Date().getTime()}.csv`)}>
              <Download className="h-3 w-3" /> Exportar CSV
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => copyToClipboard(resultados)}>
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
