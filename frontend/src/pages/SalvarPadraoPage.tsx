import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSaveDeadline } from "@/hooks/api/useSaveDeadline";

export default function SalvarPadraoPage() {
  const { toast } = useToast();
  const { mutate: saveDeadline, isPending, error } = useSaveDeadline();

  const [formData, setFormData] = useState({
    validityType: "PADRAO",
    adjustmentType: "Atualização mensal",
    startDate: "",
    endDate: "",
    scope: "",
    batchName: "",
    observations: "",
  });

  const [isDone, setIsDone] = useState(false);

  const handleSalvar = () => {
    // Validações básicas
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

    saveDeadline(
      {
        validityType: formData.validityType as "PADRAO" | "PONTUAL",
        startDate: formData.startDate,
        endDate: formData.endDate,
        observations: formData.observations,
        data: {
          adjustmentType: formData.adjustmentType,
          scope: formData.scope,
          batchName: formData.batchName,
        },
      },
      {
        onSuccess: () => {
          setIsDone(true);
          toast({
            title: "Sucesso",
            description: "Padrão vigente salvo com sucesso!",
          });
        },
        onError: (err: any) => {
          toast({
            title: "Erro",
            description: err.response?.data?.message || "Erro ao salvar padrão",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Salvar Padrão Vigente</h1>
        <p className="page-subtitle">Salve no banco um novo prazo padrão com vigência definida.</p>
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
            Padrão vigente salvo com sucesso!
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card rounded-lg border border-border p-5 mb-5">
        <h2 className="section-title">Dados de Vigência</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Tipo de Vigência</Label>
            <Select value={formData.validityType} onValueChange={(v) => setFormData({ ...formData, validityType: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PADRAO">Padrão</SelectItem>
                <SelectItem value="PONTUAL">Pontual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo de Ajuste</Label>
            <Input placeholder="Ex: Atualização mensal" className="mt-1" value={formData.adjustmentType} onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Data de Início</Label>
            <Input type="date" className="mt-1" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Data de Fim</Label>
            <Input type="date" className="mt-1" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Escopo do Ajuste</Label>
            <Input placeholder="Ex: Nacional, Regional SP" className="mt-1" value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Nome do Lote / Identificador</Label>
            <Input placeholder="Ex: LOTE-2026-04-001" className="mt-1" value={formData.batchName} onChange={(e) => setFormData({ ...formData, batchName: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-5">
        <h2 className="section-title">Observações</h2>
        <Textarea placeholder="Adicione observações sobre este padrão vigente..." rows={3} value={formData.observations} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} />
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="section-title">Ação</h2>
        {!isDone ? (
          <>
            <Button onClick={handleSalvar} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar Padrão Vigente"}
            </Button>
            {isPending && (
              <div className="mt-3">
                <Progress value={66} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">Salvando dados de vigência...</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Padrão vigente salvo com sucesso!</span>
          </div>
        )}
      </div>
    </div>
  );
}
