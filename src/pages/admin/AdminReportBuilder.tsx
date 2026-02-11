import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, Eye, Save, Loader2 } from "lucide-react";
import { reportService } from "@/services/api";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportConfig {
  dimensions?: Array<{ field: string; alias?: string }>;
  metrics?: Array<{ field: string; operation: "SUM" | "COUNT"; alias?: string }>;
  filters?: Array<{ field: string; operator: string; value: any }>;
  sort?: Array<{ field: string; direction: "ASC" | "DESC" }>;
  limit?: number;
}

const AdminReportBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [name, setName] = useState("");
  const [sourceTable, setSourceTable] = useState<string>("");
  const [visualizationType, setVisualizationType] = useState<string>("table");
  const [availableFields, setAvailableFields] = useState<{
    dimensions: string[];
    metrics: string[];
    relatedTables: Array<{ key: string; table: string; alias: string; fields: string[] }>;
  }>({ dimensions: [], metrics: [], relatedTables: [] });
  const [config, setConfig] = useState<ReportConfig>({
    dimensions: [],
    metrics: [],
    filters: [],
    sort: [],
    limit: 100,
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadReport();
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (sourceTable) {
      loadAvailableFields();
    }
  }, [sourceTable]);

  const loadReport = async () => {
    try {
      const report = await reportService.getById(Number(id));
      setName(report.name);
      setSourceTable(report.sourceTable);
      setVisualizationType(report.visualizationType);
      setConfig(report.configJson || {});
    } catch (error: any) {
      console.error("Erro ao carregar relatório:", error);
      toast.error(error.message || "Erro ao carregar relatório");
      navigate("/admin/relatorios");
    }
  };

  const loadAvailableFields = async () => {
    try {
      setIsLoadingFields(true);
      const fields = await reportService.getAvailableFields(sourceTable);
      setAvailableFields({
        dimensions: fields.dimensions || [],
        metrics: fields.metrics || [],
        relatedTables: fields.relatedTables || [],
      });
    } catch (error: any) {
      console.error("Erro ao carregar campos:", error);
      toast.error(error.message || "Erro ao carregar campos disponíveis");
      // Garantir que sempre temos arrays vazios em caso de erro
      setAvailableFields({
        dimensions: [],
        metrics: [],
        relatedTables: [],
      });
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handlePreview = async () => {
    if (!sourceTable || !config) {
      toast.error("Configure a fonte de dados e pelo menos uma dimensão ou métrica");
      return;
    }

    try {
      setIsLoadingPreview(true);
      const data = await reportService.preview(sourceTable, config);
      setPreviewData(data);
      toast.success("Preview gerado com sucesso");
    } catch (error: any) {
      console.error("Erro ao gerar preview:", error);
      toast.error(error.message || "Erro ao gerar preview");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    if (!name || !sourceTable || !config) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setIsSaving(true);
      // Validar e limpar o config antes de enviar
      const cleanConfig = {
        ...config,
        filters: config.filters?.filter(f => f.field && f.operator),
        dimensions: config.dimensions?.filter(d => d.field),
        metrics: config.metrics?.filter(m => m.field),
        sort: config.sort?.filter(s => s.field),
      };
      
      if (isEditing && id) {
        await reportService.update(Number(id), {
          name,
          sourceTable,
          visualizationType,
          config: cleanConfig,
        });
        toast.success("Relatório atualizado com sucesso");
      } else {
        await reportService.create({
          name,
          sourceTable,
          visualizationType,
          config: cleanConfig,
        });
        toast.success("Relatório criado com sucesso");
      }
      navigate("/admin/relatorios");
    } catch (error: any) {
      console.error("Erro ao salvar relatório:", error);
      const errorMessage = error?.message || error?.toString() || "Erro ao salvar relatório";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const addDimension = () => {
    setConfig({
      ...config,
      dimensions: [...(config.dimensions || []), { field: "", alias: "" }],
    });
  };

  const removeDimension = (index: number) => {
    const newDimensions = [...(config.dimensions || [])];
    newDimensions.splice(index, 1);
    setConfig({ ...config, dimensions: newDimensions });
  };

  const updateDimension = (index: number, field: string, alias?: string) => {
    const newDimensions = [...(config.dimensions || [])];
    newDimensions[index] = { field, alias: alias || "" };
    setConfig({ ...config, dimensions: newDimensions });
  };

  const addMetric = () => {
    setConfig({
      ...config,
      metrics: [
        ...(config.metrics || []),
        { field: "", operation: "COUNT", alias: "" },
      ],
    });
  };

  const removeMetric = (index: number) => {
    const newMetrics = [...(config.metrics || [])];
    newMetrics.splice(index, 1);
    setConfig({ ...config, metrics: newMetrics });
  };

  const updateMetric = (
    index: number,
    field: string,
    operation: "SUM" | "COUNT",
    alias?: string
  ) => {
    const newMetrics = [...(config.metrics || [])];
    newMetrics[index] = { field, operation, alias: alias || "" };
    setConfig({ ...config, metrics: newMetrics });
  };

  const addFilter = () => {
    setConfig({
      ...config,
      filters: [
        ...(config.filters || []),
        { field: "", operator: "=", value: "" },
      ],
    });
  };

  const removeFilter = (index: number) => {
    const newFilters = [...(config.filters || [])];
    newFilters.splice(index, 1);
    setConfig({ ...config, filters: newFilters });
  };

  const updateFilter = (
    index: number,
    field: string,
    operator: string,
    value: any
  ) => {
    const newFilters = [...(config.filters || [])];
    newFilters[index] = { field, operator, value };
    setConfig({ ...config, filters: newFilters });
  };

  const addSort = () => {
    setConfig({
      ...config,
      sort: [...(config.sort || []), { field: "", direction: "ASC" }],
    });
  };

  const removeSort = (index: number) => {
    const newSort = [...(config.sort || [])];
    newSort.splice(index, 1);
    setConfig({ ...config, sort: newSort });
  };

  const updateSort = (index: number, field: string, direction: "ASC" | "DESC") => {
    const newSort = [...(config.sort || [])];
    newSort[index] = { field, direction };
    setConfig({ ...config, sort: newSort });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            {isEditing ? "Editar Relatório" : "Novo Relatório"}
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure dimensões, métricas, filtros e visualização
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={isLoadingPreview}>
            {isLoadingPreview ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuração Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Relatório</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vendas por Agência"
              />
            </div>

            <div>
              <Label htmlFor="sourceTable">Fonte de Dados</Label>
              <Select value={sourceTable} onValueChange={setSourceTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a fonte de dados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency_points_import_items">
                    Itens de Importação
                  </SelectItem>
                  <SelectItem value="agencies">Agências</SelectItem>
                  <SelectItem value="agency_points_ledger">Ledger de Pontos</SelectItem>
                  <SelectItem value="orders">Pedidos</SelectItem>
                  <SelectItem value="order_items">Itens de Pedido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="visualizationType">Tipo de Visualização</Label>
              <Select
                value={visualizationType}
                onValueChange={setVisualizationType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Tabela</SelectItem>
                  <SelectItem value="bar">Gráfico de Barras</SelectItem>
                  <SelectItem value="line">Gráfico de Linha</SelectItem>
                  <SelectItem value="pie">Gráfico de Pizza</SelectItem>
                  <SelectItem value="area">Gráfico de Área</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="limit">Limite de Resultados</Label>
              <Input
                id="limit"
                type="number"
                value={config.limit || 100}
                onChange={(e) =>
                  setConfig({ ...config, limit: parseInt(e.target.value) || 100 })
                }
                min={1}
                max={10000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dimensões */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dimensões (Group By)</CardTitle>
              <Button variant="outline" size="sm" onClick={addDimension}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingFields ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              (config.dimensions || []).map((dim, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Campo</Label>
                    <Select
                      value={dim.field}
                      onValueChange={(value) =>
                        updateDimension(index, value, dim.alias)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um campo" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Campos da tabela principal */}
                        <SelectItem value="__main__" disabled>
                          <span className="font-semibold">Tabela Principal</span>
                        </SelectItem>
                        {availableFields.dimensions.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                        {/* Campos de tabelas relacionadas */}
                        {availableFields.relatedTables && availableFields.relatedTables.length > 0 && (
                          <>
                            {availableFields.relatedTables.map((relatedTable) => (
                              <div key={relatedTable.key}>
                                <SelectItem value={`__${relatedTable.key}__`} disabled>
                                  <span className="font-semibold">{relatedTable.alias}</span>
                                </SelectItem>
                                {relatedTable.fields.map((field) => (
                                  <SelectItem
                                    key={`${relatedTable.key}.${field}`}
                                    value={`${relatedTable.key}.${field}`}
                                  >
                                    {relatedTable.alias}.{field}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Alias (opcional)</Label>
                    <Input
                      value={dim.alias || ""}
                      onChange={(e) =>
                        updateDimension(index, dim.field, e.target.value)
                      }
                      placeholder="Nome exibido"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDimension(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            {(!config.dimensions || config.dimensions.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma dimensão adicionada
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Métricas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Métricas (Agregações)</CardTitle>
              <Button variant="outline" size="sm" onClick={addMetric}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(config.metrics || []).map((metric, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Campo</Label>
                  <Select
                    value={metric.field}
                    onValueChange={(value) =>
                      updateMetric(index, value, metric.operation, metric.alias)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.metrics.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label>Operação</Label>
                  <Select
                    value={metric.operation}
                    onValueChange={(value: "SUM" | "COUNT") =>
                      updateMetric(index, metric.field, value, metric.alias)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUM">SUM</SelectItem>
                      <SelectItem value="COUNT">COUNT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Alias (opcional)</Label>
                  <Input
                    value={metric.alias || ""}
                    onChange={(e) =>
                      updateMetric(
                        index,
                        metric.field,
                        metric.operation,
                        e.target.value
                      )
                    }
                    placeholder="Nome exibido"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMetric(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {(!config.metrics || config.metrics.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma métrica adicionada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filtros (WHERE)</CardTitle>
              <Button variant="outline" size="sm" onClick={addFilter}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(config.filters || []).map((filter, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Campo</Label>
                  <Select
                    value={filter.field}
                    onValueChange={(value) =>
                      updateFilter(index, value, filter.operator, filter.value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Campos da tabela principal */}
                      <SelectItem value="__main__" disabled>
                        <span className="font-semibold">Tabela Principal</span>
                      </SelectItem>
                      {availableFields.dimensions.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                      {/* Campos de tabelas relacionadas */}
                      {availableFields.relatedTables && availableFields.relatedTables.length > 0 && (
                        <>
                          {availableFields.relatedTables.map((relatedTable) => (
                            <div key={relatedTable.key}>
                              <SelectItem value={`__${relatedTable.key}__`} disabled>
                                <span className="font-semibold">{relatedTable.alias}</span>
                              </SelectItem>
                              {relatedTable.fields.map((field) => (
                                <SelectItem
                                  key={`${relatedTable.key}.${field}`}
                                  value={`${relatedTable.key}.${field}`}
                                >
                                  {relatedTable.alias}.{field}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label>Operador</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(value) =>
                      updateFilter(index, filter.field, value, filter.value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="=">=</SelectItem>
                      <SelectItem value="!=">!=</SelectItem>
                      <SelectItem value=">">&gt;</SelectItem>
                      <SelectItem value="<">&lt;</SelectItem>
                      <SelectItem value=">=">&gt;=</SelectItem>
                      <SelectItem value="<=">&lt;=</SelectItem>
                      <SelectItem value="LIKE">LIKE</SelectItem>
                      <SelectItem value="IS NULL">IS NULL</SelectItem>
                      <SelectItem value="IS NOT NULL">IS NOT NULL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Valor</Label>
                  <Input
                    value={filter.value || ""}
                    onChange={(e) =>
                      updateFilter(index, filter.field, filter.operator, e.target.value)
                    }
                    placeholder="Valor"
                    disabled={filter.operator === "IS NULL" || filter.operator === "IS NOT NULL"}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilter(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {(!config.filters || config.filters.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum filtro adicionado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ordenação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ordenação (ORDER BY)</CardTitle>
            <Button variant="outline" size="sm" onClick={addSort}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(config.sort || []).map((sort, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Campo</Label>
                <Select
                  value={sort.field}
                  onValueChange={(value) =>
                    updateSort(index, value, sort.direction)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.dimensions.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label>Direção</Label>
                <Select
                  value={sort.direction}
                  onValueChange={(value: "ASC" | "DESC") =>
                    updateSort(index, sort.field, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">ASC</SelectItem>
                    <SelectItem value="DESC">DESC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSort(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!config.sort || config.sort.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma ordenação adicionada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview dos Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(previewData[0] || {}).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value: any, i) => (
                        <TableCell key={i}>
                          {value !== null && value !== undefined
                            ? String(value)
                            : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {previewData.length > 10 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Mostrando 10 de {previewData.length} resultados
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReportBuilder;
