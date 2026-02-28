import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Ruler } from "lucide-react";
import { sizeChartService } from "@/services/api";
import { toast } from "sonner";

interface SizeChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper para obter a URL base dos assets
const getAssetsBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return "";
};

const SizeChartDialog = ({
  open,
  onOpenChange,
}: SizeChartDialogProps) => {
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSizeCharts, setIsLoadingSizeCharts] = useState(false);
  const [sizeChartForm, setSizeChartForm] = useState({
    model: "" as 'MASCULINO' | 'FEMININO' | 'UNISEX' | '',
    measurements: [] as Array<{
      id?: number;
      size: string;
      chest: string;
      waist: string;
      length: string;
      shoulder: string;
      sleeve: string;
    }>,
  });
  const [editingSizeChartId, setEditingSizeChartId] = useState<number | null>(null);
  const [sizeChartImage, setSizeChartImage] = useState<File | null>(null);
  const [isUploadingSizeChartImage, setIsUploadingSizeChartImage] = useState(false);

  const loadSizeCharts = async () => {
    try {
      setIsLoadingSizeCharts(true);
      const data = await sizeChartService.getAll();
      setSizeCharts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Erro ao carregar grades de tamanho:", error);
      setSizeCharts([]);
    } finally {
      setIsLoadingSizeCharts(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSizeCharts();
    }
  }, [open]);

  const handleAddMeasurementRow = () => {
    setSizeChartForm({
      ...sizeChartForm,
      measurements: [
        ...sizeChartForm.measurements,
        { size: "", chest: "", waist: "", length: "", shoulder: "", sleeve: "" },
      ],
    });
  };

  const handleRemoveMeasurementRow = (index: number) => {
    const newMeasurements = sizeChartForm.measurements.filter((_, i) => i !== index);
    setSizeChartForm({ ...sizeChartForm, measurements: newMeasurements });
  };

  const handleUpdateMeasurement = (index: number, field: string, value: string) => {
    const newMeasurements = [...sizeChartForm.measurements];
    newMeasurements[index] = { ...newMeasurements[index], [field]: value };
    setSizeChartForm({ ...sizeChartForm, measurements: newMeasurements });
  };

  const handleSaveSizeChart = async () => {
    if (!sizeChartForm.model) {
      toast.error("Selecione um modelo");
      return;
    }

    if (sizeChartForm.measurements.length === 0) {
      toast.error("Adicione pelo menos uma medida");
      return;
    }

    try {
      setIsLoading(true);
      const measurements = sizeChartForm.measurements.map((m) => ({
        size: m.size,
        chest: m.chest ? parseFloat(m.chest) : undefined,
        waist: m.waist ? parseFloat(m.waist) : undefined,
        length: m.length ? parseFloat(m.length) : undefined,
        shoulder: m.shoulder ? parseFloat(m.shoulder) : undefined,
        sleeve: m.sleeve ? parseFloat(m.sleeve) : undefined,
      }));

      if (editingSizeChartId) {
        // Atualizar grade existente
        await sizeChartService.update(editingSizeChartId, {
          measurements: measurements.map((m, index) => ({
            id: sizeChartForm.measurements[index].id,
            ...m,
          })),
        });
        
        // Upload de imagem se houver (ao editar)
        if (sizeChartImage) {
          try {
            setIsUploadingSizeChartImage(true);
            await sizeChartService.uploadImage(editingSizeChartId, sizeChartImage);
            toast.success("Imagem da grade atualizada com sucesso!");
          } catch (error: any) {
            console.error("Erro ao fazer upload da imagem:", error);
            toast.error("Erro ao fazer upload da imagem, mas a grade foi atualizada");
          } finally {
            setIsUploadingSizeChartImage(false);
          }
        }
        
        toast.success("Grade de tamanho atualizada com sucesso!");
      } else {
        // Criar nova grade
        const result = await sizeChartService.create({
          name: `Grade ${sizeChartForm.model}`,
          categoryId: 0,
          model: sizeChartForm.model,
          measurements,
        });

        // Upload de imagem se houver
        if (sizeChartImage && result.id) {
          try {
            setIsUploadingSizeChartImage(true);
            await sizeChartService.uploadImage(result.id, sizeChartImage);
            toast.success("Imagem da grade enviada com sucesso!");
          } catch (error: any) {
            console.error("Erro ao fazer upload da imagem:", error);
            toast.error("Erro ao fazer upload da imagem, mas a grade foi criada");
          } finally {
            setIsUploadingSizeChartImage(false);
          }
        }

        toast.success("Grade de tamanho criada com sucesso!");
      }

      // Limpar formulário
      setSizeChartForm({
        model: "" as 'MASCULINO' | 'FEMININO' | 'UNISEX' | '',
        measurements: [],
      });
      setEditingSizeChartId(null);
      setSizeChartImage(null);
      await loadSizeCharts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar grade de tamanho");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSizeChart = async (sizeChart: any) => {
    try {
      setIsLoadingSizeCharts(true);
      const fullSizeChart = await sizeChartService.getById(sizeChart.id);
      setSizeChartForm({
        model: fullSizeChart.model || "",
        measurements: fullSizeChart.measurements?.map((m: any) => ({
          id: m.id,
          size: m.size || "",
          chest: m.chest?.toString() || "",
          waist: m.waist?.toString() || "",
          length: m.length?.toString() || "",
          shoulder: m.shoulder?.toString() || "",
          sleeve: m.sleeve?.toString() || "",
        })) || [],
      });
      setEditingSizeChartId(sizeChart.id);
    } catch (error: any) {
      toast.error("Erro ao carregar grade de tamanho");
      console.error(error);
    } finally {
      setIsLoadingSizeCharts(false);
    }
  };

  const handleDeleteSizeChart = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta grade de tamanho?")) return;

    try {
      await sizeChartService.delete(id);
      toast.success("Grade de tamanho excluída com sucesso!");
      await loadSizeCharts();
    } catch (error: any) {
      toast.error("Erro ao excluir grade de tamanho");
      console.error(error);
    }
  };

  const handleCancelEditSizeChart = () => {
    setSizeChartForm({
      model: "" as 'MASCULINO' | 'FEMININO' | 'UNISEX' | '',
      measurements: [],
    });
    setEditingSizeChartId(null);
    setSizeChartImage(null);
  };

  const getModelName = (model: string) => {
    switch (model) {
      case 'MASCULINO':
        return 'Masculino';
      case 'FEMININO':
        return 'Feminino';
      case 'UNISEX':
        return 'Unisex';
      default:
        return model;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            Gerenciar Grades de Tamanhos
          </DialogTitle>
          <DialogDescription>
            Crie e gerencie grades de tamanhos globais por modelo (Masculino/Feminino). As grades serão aplicadas a todos os produtos do modelo correspondente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              As grades de tamanhos são globais e aplicadas a todos os produtos. Selecione o modelo (Masculino ou Feminino) para criar ou editar a grade correspondente.
            </p>
          </div>

          {/* Formulário de Grade */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold">
                  {editingSizeChartId ? "Editar Grade de Tamanhos" : "Criar Grade de Tamanhos"}
                </h3>

                {/* Modelo */}
                <div className="space-y-2">
                  <Label htmlFor="size-chart-model">Modelo *</Label>
                  <Select
                    value={sizeChartForm.model}
                    onValueChange={(value) =>
                      setSizeChartForm({ ...sizeChartForm, model: value as 'MASCULINO' | 'FEMININO' | 'UNISEX' })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger id="size-chart-model">
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASCULINO">Masculino</SelectItem>
                      <SelectItem value="FEMININO">Feminino</SelectItem>
                      <SelectItem value="UNISEX">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Upload de Imagem */}
                <div className="space-y-2">
                  <Label htmlFor="size-chart-image">Imagem da Grade (Opcional)</Label>
                  <Input
                    id="size-chart-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSizeChartImage(file);
                      }
                    }}
                    disabled={isLoading || isUploadingSizeChartImage}
                  />
                  {sizeChartImage && (
                    <p className="text-xs text-muted-foreground">
                      Arquivo selecionado: {sizeChartImage.name}
                    </p>
                  )}
                </div>

                {/* Medidas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Medidas</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddMeasurementRow}
                      disabled={isLoading || !sizeChartForm.model}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Linha
                    </Button>
                  </div>

                  {sizeChartForm.measurements.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                      Nenhuma medida adicionada. Clique em "Adicionar Linha" para começar.
                    </p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tamanho</TableHead>
                            <TableHead>Peito (cm)</TableHead>
                            <TableHead>Cintura (cm)</TableHead>
                            <TableHead>Comprimento (cm)</TableHead>
                            <TableHead>Ombro (cm)</TableHead>
                            <TableHead>Manga (cm)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sizeChartForm.measurements.map((measurement, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Input
                                  placeholder="P, M, G..."
                                  value={measurement.size}
                                  onChange={(e) =>
                                    handleUpdateMeasurement(index, "size", e.target.value)
                                  }
                                  disabled={isLoading}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={measurement.chest}
                                  onChange={(e) =>
                                    handleUpdateMeasurement(index, "chest", e.target.value)
                                  }
                                  disabled={isLoading}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={measurement.waist}
                                  onChange={(e) =>
                                    handleUpdateMeasurement(index, "waist", e.target.value)
                                  }
                                  disabled={isLoading}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={measurement.length}
                                  onChange={(e) =>
                                    handleUpdateMeasurement(index, "length", e.target.value)
                                  }
                                  disabled={isLoading}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={measurement.shoulder}
                                  onChange={(e) =>
                                    handleUpdateMeasurement(index, "shoulder", e.target.value)
                                  }
                                  disabled={isLoading}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={measurement.sleeve}
                                  onChange={(e) =>
                                    handleUpdateMeasurement(index, "sleeve", e.target.value)
                                  }
                                  disabled={isLoading}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMeasurementRow(index)}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveSizeChart}
                    disabled={isLoading || isUploadingSizeChartImage || !sizeChartForm.model || sizeChartForm.measurements.length === 0}
                  >
                    {isLoading || isUploadingSizeChartImage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {isUploadingSizeChartImage ? "Enviando imagem..." : "Salvando..."}
                      </>
                    ) : editingSizeChartId ? (
                      <>
                        <Pencil className="w-4 h-4 mr-2" />
                        Atualizar Grade
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Grade
                      </>
                    )}
                  </Button>
                  {editingSizeChartId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEditSizeChart}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {/* Lista de Grades Cadastradas */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Grades Cadastradas</h3>
                {isLoadingSizeCharts ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : sizeCharts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma grade cadastrada para esta categoria</p>
                ) : (
                  <div className="space-y-4">
                    {sizeCharts.map((sizeChart) => (
                      <div key={sizeChart.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{sizeChart.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Modelo: {getModelName(sizeChart.model || "")} | {sizeChart.measurements?.length || 0} medidas
                            </p>
                            {sizeChart.imagePath && (
                              <div className="mt-2">
                                <img
                                  src={sizeChart.imagePath.startsWith('http') ? sizeChart.imagePath : `${getAssetsBaseUrl()}${sizeChart.imagePath}`}
                                  alt={sizeChart.name}
                                  className="max-w-xs h-auto rounded border"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSizeChart(sizeChart)}
                              disabled={isLoadingSizeCharts}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSizeChart(sizeChart.id)}
                              disabled={isLoadingSizeCharts}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {sizeChart.measurements && sizeChart.measurements.length > 0 && (
                          <div className="border-t pt-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tamanho</TableHead>
                                  <TableHead>Peito</TableHead>
                                  <TableHead>Cintura</TableHead>
                                  <TableHead>Comprimento</TableHead>
                                  <TableHead>Ombro</TableHead>
                                  <TableHead>Manga</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sizeChart.measurements.map((m: any) => (
                                  <TableRow key={m.id}>
                                    <TableCell className="font-medium">{m.size}</TableCell>
                                    <TableCell>{m.chest || "-"}</TableCell>
                                    <TableCell>{m.waist || "-"}</TableCell>
                                    <TableCell>{m.length || "-"}</TableCell>
                                    <TableCell>{m.shoulder || "-"}</TableCell>
                                    <TableCell>{m.sleeve || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SizeChartDialog;
