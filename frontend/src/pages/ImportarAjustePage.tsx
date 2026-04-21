import { useRef, useState } from "react";
import { Upload, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useImportPlanning } from "@/hooks/api/useImportPlanning";

export default function ImportarAjustePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: importPlanning, isPending, error } = useImportPlanning();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [formData, setFormData] = useState({
    adjustmentType: "FERIADO",
    startDate: "",
    endDate: "",
    scope: "",
    batchName: "",
    observations: "",
  });

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

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

  const handleImportar = () => {
    if (!uploadedFile) {
      toast({ title: "Erro", description: "Selecione um arquivo", variant: "destructive" });
      return;
    }
    if (!formData.startDate) {
      toast({ title: "Erro", description: "Preencha a data de início", variant: "destructive" });
      return;
    }
    if (!formData.endDate) {
      toast({ title: "Erro", description: "Preencha a data de fim", variant: "destructive" });
      return;
    }
    if (!formData.batchName) {
      toast({ title: "Erro", description: "Preencha o nome do lote", variant: "destructive" });
      return;
    }

    setIsDone(false);

    importPlanning(
      {
        file: uploadedFile,
        adjustmentType: formData.adjustmentType as "FERIADO" | "PARALISACAO" | "AJUSTE",
        startDate: formData.startDate,
        endDate: formData.endDate,
        observations: formData.observations,
      },
      {
        onSuccess: () => {
          setIsDone(true);
          toast({
            title: "Sucesso",
            description: "Ajuste pontual importado com sucesso!",
          });
        },
        onError: (err: any) => {
          toast({
            title: "Erro",
            description: err.response?.data?.message || "Erro ao importar ajuste",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Importar Ajuste Pontual</h1>
        <p className="page-subtitle">Suba uma planilha validada para um período temporário.</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 mb-5 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Use esta funcionalidade para feriados, paralisações, mudanças temporárias e exceções operacionais.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </AlertDescription>
        </Alert>
      )}

      {isDone && (
        <Alert className="mb-5 bg-success/10 border-success">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Ajuste pontual importado com sucesso!
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card rounded-lg border border-border p-5 mb-5">
        <h2 className="section-title">Upload da Planilha Validada</h2>
        <div
          className="upload-zone cursor-pointer hover:bg-muted/50 transition"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Arraste e solte ou clique para selecionar</p>
          <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="mt-3">
          <span className="text-xs text-muted-foreground">
            {uploadedFile ? `Arquivo: ${uploadedFile.name}` : "Nenhum arquivo selecionado"}
          </span>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-5">
        <h2 className="section-title">Dados do Ajuste</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Tipo de Ajuste</Label>
            <Select value={formData.adjustmentType} onValueChange={(v) => setFormData({ ...formData, adjustmentType: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FERIADO">Feriado</SelectItem>
                <SelectItem value="PARALISACAO">Paralisação</SelectItem>
                <SelectItem value="AJUSTE">Ajuste Operacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Identificação</Label>
            <Input placeholder="Ex: Feriado regional" className="mt-1" value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Data de Início</Label>
            <Input type="date" className="mt-1" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Data de Fim</Label>
            <Input type="date" className="mt-1" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Nome do Lote</Label>
            <Input placeholder="Ex: FERIADO-TIRADENTES-2026" className="mt-1" value={formData.batchName} onChange={(e) => setFormData({ ...formData, batchName: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Observação</Label>
            <Textarea placeholder="Detalhes do ajuste pontual..." rows={2} className="mt-1" value={formData.observations} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="section-title">Ação</h2>
        {!isDone ? (
          <>
            <Button onClick={handleImportar} disabled={isPending || !uploadedFile}>
              {isPending ? "Importando..." : "Importar Ajuste"}
            </Button>
            {isPending && (
              <div className="mt-3">
                <Progress value={66} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">Processando planilha...</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Ajuste pontual importado com sucesso!</span>
          </div>
        )}
      </div>
    </div>
  );
}
