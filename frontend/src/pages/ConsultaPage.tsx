import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useGetDeadlines } from "@/hooks/api/useGetDeadlines";
import { useGetHistory } from "@/hooks/api/useGetHistory";
import { useGetPlanning } from "@/hooks/api/useGetPlanning";
import { useComparePrazos } from "@/hooks/api/useComparePrazos";

export default function ConsultaPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("planejamento");
  const [showResults, setShowResults] = useState(false);
  
  // Filtros
  const [dataReferencia, setDataReferencia] = useState("");
  const [locComercial, setLocComercial] = useState("");
  const [geografia, setGeografia] = useState("");
  const [modal, setModal] = useState("");
  
  // Comparação
  const [versionId1, setVersionId1] = useState("");
  const [versionId2, setVersionId2] = useState("");

  // Queries
  const { data: deadlines, isLoading: deadlinesLoading } = useGetDeadlines(
    {
      startDate: dataReferencia,
      modal: modal || undefined,
      geography: geografia || undefined,
      cd: locComercial || undefined,
    },
    showResults && activeTab === "planejamento"
  );

  const { data: history, isLoading: historyLoading } = useGetHistory(
    { startDate: dataReferencia },
    showResults && activeTab === "historico"
  );

  const { data: planning, isLoading: planningLoading } = useGetPlanning(
    { startDate: dataReferencia },
    showResults && activeTab === "prazo"
  );

  const { data: comparison, isLoading: comparisonLoading } = useComparePrazos(
    { versionId1, versionId2 },
    showResults && activeTab === "comparacao" && versionId1 && versionId2
  );

  const handleConsultarVigente = () => {
    setActiveTab("planejamento");
    setShowResults(true);
    toast({ title: "Consultando", description: "Buscando dados vigentes..." });
  };

  const handleHistoricoPlanjamento = () => {
    setActiveTab("prazo");
    setShowResults(true);
    toast({ title: "Consultando", description: "Buscando histórico de planejamento..." });
  };

  const handleHistoricoPrazo = () => {
    setActiveTab("historico");
    setShowResults(true);
    toast({ title: "Consultando", description: "Buscando histórico de prazos..." });
  };

  const handleComparar = () => {
    if (!versionId1 || !versionId2) {
      toast({ title: "Erro", description: "Selecione duas versões para comparar", variant: "destructive" });
      return;
    }
    setActiveTab("comparacao");
    setShowResults(true);
  };

  const deadlinesList = deadlines?.results || deadlines || [];
  const historyList = history?.results || history || [];
  const planningList = planning?.results || planning || [];
  const comparisonData = comparison?.results || comparison;

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Consulta</h1>
        <p className="page-subtitle">Consulte planejamento e prazo vigente em qualquer data.</p>
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-lg border border-border p-5 mb-5">
        <h2 className="section-title">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">Data de Referência</Label>
            <Input type="date" className="mt-1" value={dataReferencia} onChange={(e) => setDataReferencia(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Localização Comercial</Label>
            <Input placeholder="Ex: São Paulo" className="mt-1" value={locComercial} onChange={(e) => setLocComercial(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Geografia</Label>
            <Input placeholder="Ex: Capital" className="mt-1" value={geografia} onChange={(e) => setGeografia(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Modal</Label>
            <Select value={modal} onValueChange={setModal}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="RODO">RODO</SelectItem>
                <SelectItem value="COURIER">COURIER</SelectItem>
                <SelectItem value="RODO_COURIER">RODO+COURIER</SelectItem>
                <SelectItem value="DESTINO_LOJA">DESTINO LOJA</SelectItem>
                <SelectItem value="RETIRA">RETIRA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleConsultarVigente}>Consultar Vigente</Button>
          <Button size="sm" variant="outline" onClick={handleHistoricoPlanjamento}>Histórico Planejamento</Button>
          <Button size="sm" variant="outline" onClick={handleHistoricoPrazo}>Histórico Prazo</Button>
          <Button size="sm" variant="outline" onClick={handleComparar}>Comparar com Anterior</Button>
        </div>
      </div>

      {showResults && (
        <>
          {/* Cards Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="stat-card">
              <div className="stat-card-value">{deadlinesList.length || 0}</div>
              <div className="stat-card-label">Rotas vigentes</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">
                {(deadlinesList.reduce((sum: number, r: any) => sum + (r.prazoCd || 0), 0) / (deadlinesList.length || 1)).toFixed(1)}
              </div>
              <div className="stat-card-label">Prazo médio CD</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">
                {(deadlinesList.reduce((sum: number, r: any) => sum + (r.prazoTr || 0), 0) / (deadlinesList.length || 1)).toFixed(1)}
              </div>
              <div className="stat-card-label">Prazo médio TR</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">
                {(deadlinesList.reduce((sum: number, r: any) => sum + (r.prazoCliente || 0), 0) / (deadlinesList.length || 1)).toFixed(1)}
              </div>
              <div className="stat-card-label">Prazo médio Cliente</div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-5">
            <TabsList>
              <TabsTrigger value="planejamento" className="text-xs">Planejamento Vigente</TabsTrigger>
              <TabsTrigger value="prazo" className="text-xs">Prazo Vigente</TabsTrigger>
              <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
              <TabsTrigger value="comparacao" className="text-xs">Comparação</TabsTrigger>
            </TabsList>

            <TabsContent value="planejamento">
              <div className="bg-card rounded-lg border border-border overflow-x-auto">
                {deadlinesLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Carregando...</div>
                ) : deadlinesList.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr><th>CD</th><th>Modal</th><th>Loc. Comercial</th><th>Geografia</th><th>Prazo CD</th><th>Prazo TR</th><th>Prazo Cliente</th></tr>
                    </thead>
                    <tbody>
                      {deadlinesList.slice(0, 10).map((r: any, idx: number) => (
                        <tr key={idx}><td className="font-medium">{r.cd || "-"}</td><td>{r.modal || "-"}</td><td>{r.commercialLocation || "-"}</td><td>{r.geography || "-"}</td><td>{r.prazoCd || 0}</td><td>{r.prazoTr || 0}</td><td className="font-semibold">{r.prazoCliente || 0}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">Nenhum resultado encontrado</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="prazo">
              <div className="bg-card rounded-lg border border-border overflow-x-auto">
                {planningLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Carregando...</div>
                ) : planningList.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>CD</th><th>Modal</th><th>Prazo CD</th><th>Prazo TR</th><th>Prazo Cliente</th></tr></thead>
                    <tbody>
                      {planningList.slice(0, 10).map((r: any, idx: number) => (
                        <tr key={idx}><td className="font-medium">{r.cd || "-"}</td><td>{r.modal || "-"}</td><td>{r.prazoCd || 0}</td><td>{r.prazoTr || 0}</td><td className="font-semibold">{r.prazoCliente || 0}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">Nenhum resultado encontrado</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="historico">
              <div className="space-y-3">
                {historyLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Carregando...</div>
                ) : historyList.length > 0 ? (
                  historyList.slice(0, 10).map((h: any) => (
                    <div key={h.id || h.lote} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{h.lote || h.batchName || "-"}</p>
                        <p className="text-xs text-muted-foreground">{h.date || h.createdAt || "-"} · {h.type || h.validityType || "-"}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${h.status === "Ativo" || h.status === "ACTIVE" ? "bg-success/10 text-success" : h.status === "Expirado" || h.status === "EXPIRED" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {h.status || "Desconhecido"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">Nenhum histórico encontrado</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comparacao">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Versão 1</Label>
                    <Input placeholder="ID da versão" className="mt-1" value={versionId1} onChange={(e) => setVersionId1(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Versão 2</Label>
                    <Input placeholder="ID da versão" className="mt-1" value={versionId2} onChange={(e) => setVersionId2(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleComparar} size="sm">Comparar Versões</Button>

                {comparisonLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Comparando...</div>
                ) : comparisonData ? (
                  <div className="bg-card rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                      Comparação realizada. Total de linhas: {comparisonData.totalLines || 0}. 
                      Diferenças encontradas: {comparisonData.differences || 0}
                    </p>
                  </div>
                ) : (
                  <div className="bg-card rounded-lg border border-border p-6 text-center text-muted-foreground">
                    <p className="text-sm">Insira os IDs das versões e clique em "Comparar Versões"</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
