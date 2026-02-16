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
import { Switch } from "@/components/ui/switch";
import { Plus, X, Eye, Save, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Check, Pencil } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";

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

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const [name, setName] = useState("");
  const [sourceTable, setSourceTable] = useState<string>("");
  const [visualizationType, setVisualizationType] = useState<string>("table");
  const [isPublic, setIsPublic] = useState(false);
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
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});

  // Mapeamento de tabelas para nomes amigáveis
  const tableOptions = [
    { value: "agencies", label: "Agências", description: "Dados das agências cadastradas" },
    { value: "agency_points_import_items", label: "Imports de Pontos", description: "Dados dos imports de pontos realizados" },
    { value: "order_items", label: "Produtos", description: "Dados dos produtos em pedidos" },
  ];

  useEffect(() => {
    if (isEditing && id) {
      loadReport();
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (sourceTable && currentStep >= 2) {
      loadAvailableFields();
    }
  }, [sourceTable, currentStep]);

  const loadReport = async () => {
    try {
      const report = await reportService.getById(Number(id));
      setName(report.name);
      setSourceTable(report.sourceTable);
      setVisualizationType(report.visualizationType);
      setIsPublic(report.isPublic || false);
      const loadedConfig = report.configJson || {};
      setConfig(loadedConfig);
      // Carregar colunas selecionadas das dimensões
      if (loadedConfig.dimensions && loadedConfig.dimensions.length > 0) {
        setSelectedColumns(loadedConfig.dimensions.map((d: any) => d.field));
      }
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

  // Obter todas as colunas disponíveis (tabela principal + relacionadas)
  const getAllAvailableColumns = () => {
    const columns: Array<{ value: string; label: string; table: string }> = [];
    
    // Colunas da tabela principal
    availableFields.dimensions.forEach((field) => {
      columns.push({
        value: field,
        label: field,
        table: getTableDisplayName(sourceTable),
      });
    });

    // Colunas das tabelas relacionadas
    availableFields.relatedTables.forEach((relatedTable) => {
      relatedTable.fields.forEach((field) => {
        columns.push({
          value: `${relatedTable.key}.${field}`,
          label: `${relatedTable.alias}.${field}`,
          table: relatedTable.alias,
        });
      });
    });

    return columns;
  };

  // Toggle de seleção de coluna
  const toggleColumn = (columnValue: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnValue)) {
        return prev.filter((c) => c !== columnValue);
      } else {
        return [...prev, columnValue];
      }
    });
  };

  // Função para verificar se um campo é numérico (métrica)
  const isNumericField = (field: string): boolean => {
    // Verificar se está na lista de métricas da tabela principal
    if (availableFields.metrics.includes(field)) {
      return true;
    }
    // Verificar se é um campo numérico de tabela relacionada
    // Formato: "relationshipKey.field" (ex: "imports.points")
    const parts = field.split(".");
    if (parts.length === 2) {
      const [relationshipKey, fieldName] = parts;
      // Verificar se a tabela relacionada tem esse campo como numérico
      const relatedTable = availableFields.relatedTables.find((rt) => rt.key === relationshipKey);
      if (relatedTable) {
        // Campos numéricos conhecidos para tabelas relacionadas
        const numericFields: Record<string, string[]> = {
          imports: ["points"],
          orders: ["total_points"],
          order_items: ["quantity", "points_per_unit"],
        };
        const tableAlias = relatedTable.alias;
        return numericFields[tableAlias]?.includes(fieldName) || false;
      }
    }
    return false;
  };

  // Atualizar config quando colunas são selecionadas (apenas no Step 2)
  useEffect(() => {
    // Só atualizar automaticamente se estivermos no Step 2
    // No Step 6, o usuário pode ajustar manualmente o agrupamento
    if (currentStep === 2 && selectedColumns.length > 0) {
      // Separar colunas numéricas (métricas) de colunas não numéricas (dimensões)
      const dimensions: Array<{ field: string; alias: string }> = [];
      const metrics: Array<{ field: string; operation: "SUM" | "COUNT"; alias: string }> = [];

      selectedColumns.forEach((col) => {
        if (isNumericField(col)) {
          // Campo numérico vira métrica com SUM
          // Verificar se já não existe essa métrica (para evitar duplicatas)
          if (!metrics.some((m) => m.field === col)) {
            metrics.push({ field: col, operation: "SUM", alias: "" });
          }
        } else {
          // Campo não numérico vira dimensão
          dimensions.push({ field: col, alias: "" });
        }
      });

      setConfig((prev) => ({
        ...prev,
        dimensions,
        // Combinar métricas do Step 3 com as do Step 2 (colunas numéricas)
        metrics: [
          ...(prev.metrics?.filter((m) => !selectedColumns.includes(m.field)) || []), // Manter métricas do Step 3 que não foram selecionadas como colunas
          ...metrics, // Adicionar métricas das colunas numéricas selecionadas
        ],
      }));
    }
  }, [selectedColumns, currentStep, availableFields]);

  // Função para encontrar a métrica ou dimensão correspondente a uma coluna do preview
  const findFieldForColumn = (columnKey: string): { type: 'metric' | 'dimension' | null; index: number } => {
    // Verificar métricas primeiro
    if (config.metrics && config.metrics.length > 0) {
      for (let i = 0; i < config.metrics.length; i++) {
        const metric = config.metrics[i];
        const parts = metric.field.split(".");
        const fieldName = parts.length > 1 ? parts[1] : metric.field;
        const defaultAlias = metric.operation === "SUM" ? `total_${fieldName}` : `contagem_${fieldName}`;
        
        // Verificar se a coluna corresponde a esta métrica
        if (columnKey === defaultAlias || columnKey === metric.alias || 
            (metric.alias && columnKey === metric.alias) || 
            (!metric.alias && columnKey === defaultAlias)) {
          return { type: 'metric', index: i };
        }
      }
    }

    // Verificar dimensões
    if (config.dimensions && config.dimensions.length > 0) {
      for (let i = 0; i < config.dimensions.length; i++) {
        const dimension = config.dimensions[i];
        const parts = dimension.field.split(".");
        const fieldName = parts.length > 1 ? parts[1] : dimension.field;
        
        // Verificar se a coluna corresponde a esta dimensão
        if (columnKey === fieldName || columnKey === dimension.alias || 
            (dimension.alias && columnKey === dimension.alias) || 
            (!dimension.alias && columnKey === fieldName)) {
          return { type: 'dimension', index: i };
        }
      }
    }

    return { type: null, index: -1 };
  };

  // Função para aplicar o alias de uma coluna à métrica ou dimensão correspondente
  const applyColumnAlias = (columnKey: string, alias: string) => {
    const field = findFieldForColumn(columnKey);
    
    if (field.type === 'metric' && config.metrics) {
      const updatedMetrics = [...config.metrics];
      updatedMetrics[field.index] = {
        ...config.metrics[field.index],
        alias: alias.trim(),
      };
      setConfig({
        ...config,
        metrics: updatedMetrics,
      });
    } else if (field.type === 'dimension' && config.dimensions) {
      const updatedDimensions = [...config.dimensions];
      updatedDimensions[field.index] = {
        ...config.dimensions[field.index],
        alias: alias.trim(),
      };
      setConfig({
        ...config,
        dimensions: updatedDimensions,
      });
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
      
      // Inicializar os aliases das colunas com os valores atuais
      if (data.length > 0) {
        const initialAliases: Record<string, string> = {};
        Object.keys(data[0]).forEach((key) => {
          const field = findFieldForColumn(key);
          if (field.type === 'metric' && config.metrics?.[field.index]?.alias) {
            initialAliases[key] = config.metrics[field.index].alias;
          } else if (field.type === 'dimension' && config.dimensions?.[field.index]?.alias) {
            initialAliases[key] = config.dimensions[field.index].alias;
          } else {
            initialAliases[key] = key; // Usar o nome original como padrão
          }
        });
        setColumnAliases(initialAliases);
      }
      
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
          isPublic,
        });
        toast.success("Relatório atualizado com sucesso");
      } else {
        await reportService.create({
          name,
          sourceTable,
          visualizationType,
          config: cleanConfig,
          isPublic,
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

  // Validações para cada step
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return name.trim() !== "" && sourceTable !== "";
      case 2:
        // Precisa de pelo menos uma coluna selecionada
        return selectedColumns.length > 0;
      case 3:
        return true; // Métrica é opcional agora
      case 4:
        return true; // Filtros são opcionais
      case 5:
        return visualizationType !== "";
      case 6:
        return true; // Preview
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (!canProceedFromStep(currentStep)) {
      const messages: Record<number, string> = {
        1: "Preencha o nome e selecione a fonte de dados",
        2: "Selecione pelo menos uma coluna para exibir no relatório",
        5: "Selecione o tipo de visualização",
      };
      toast.error(messages[currentStep] || "Complete os campos obrigatórios antes de continuar");
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      
      // Carregar campos quando avançar para step 2 (agora é selecionar colunas)
      if (currentStep === 1 && sourceTable) {
        loadAvailableFields();
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      // Limpar apenas se voltar do step 2 para o step 1 (mudou a fonte)
      if (currentStep === 2) {
        setConfig({
          dimensions: [],
          metrics: [],
          filters: [],
          sort: [],
          limit: 100,
        });
        setSelectedColumns([]);
        setPreviewData([]);
      }
      // Limpar métricas se voltar do step 3 para o step 2
      if (currentStep === 3) {
        setConfig({
          ...config,
          metrics: [],
        });
      }
      setCurrentStep(currentStep - 1);
    }
  };

  // Verificar se um step está completo (pode navegar para ele)
  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return name.trim() !== "" && sourceTable !== "";
      case 2:
        return true; // Métrica é opcional, sempre pode acessar
      case 3:
        // Se tem métrica agregada, precisa de dimensão. Se não tem métrica, precisa de pelo menos uma dimensão
        if (config.metrics && config.metrics.length > 0) {
          return config.dimensions && config.dimensions.length > 0;
        }
        return config.dimensions && config.dimensions.length > 0;
      case 4:
        return true; // Filtros são opcionais, sempre pode acessar
      case 5:
        return visualizationType !== "";
      case 6:
        return true; // Preview sempre acessível
      default:
        return false;
    }
  };

  // Navegar para um step específico
  const handleStepClick = (targetStep: number) => {
    // Só pode navegar para steps já completados ou o step atual
    if (targetStep === currentStep) {
      return; // Já está neste step
    }

    // Se está tentando ir para um step futuro, validar se pode
    if (targetStep > currentStep) {
      if (!canProceedFromStep(currentStep)) {
        const messages: Record<number, string> = {
          1: "Complete o passo atual antes de avançar",
          2: "Selecione pelo menos uma métrica antes de avançar",
          3: "Selecione pelo menos uma coluna para agrupar antes de avançar",
          5: "Selecione o tipo de visualização antes de avançar",
        };
        toast.error(messages[currentStep] || "Complete os campos obrigatórios antes de avançar");
        return;
      }
    }

    // Se está voltando do step 2 para o step 1, limpar configurações
    if (targetStep === 1 && currentStep === 2) {
      setConfig({
        dimensions: [],
        metrics: [],
        filters: [],
        sort: [],
        limit: 100,
      });
      setSelectedColumns([]);
      setPreviewData([]);
    }

    // Carregar campos se necessário
    if (targetStep >= 2 && sourceTable) {
      loadAvailableFields();
    }

    setCurrentStep(targetStep);
  };

  const getTableDisplayName = (tableValue: string) => {
    const option = tableOptions.find(opt => opt.value === tableValue);
    return option?.label || tableValue;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            {isEditing ? "Editar Relatório" : "Novo Relatório"}
          </h2>
          <p className="text-muted-foreground mt-1">
            Crie relatórios de forma simples e intuitiva
          </p>
        </div>
      </div>

      {/* Indicador de Progresso */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5, 6].map((step) => {
              const isComplete = isStepComplete(step);
              const isClickable = step <= currentStep || isComplete;
              
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        currentStep >= step
                          ? "bg-primary text-primary-foreground border-primary"
                          : isComplete
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-muted text-muted-foreground border-muted"
                      } ${
                        isClickable ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-50"
                      }`}
                      onClick={() => isClickable && handleStepClick(step)}
                      title={
                        step === currentStep
                          ? "Passo atual"
                          : isClickable
                          ? `Clique para ir ao passo ${step}`
                          : "Complete os passos anteriores primeiro"
                      }
                    >
                      {currentStep > step ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <span>{step}</span>
                      )}
                    </div>
                    <p
                      className={`mt-2 text-xs font-medium text-center ${
                        currentStep >= step ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step === 1 && "Fonte"}
                      {step === 2 && "Agrupar"}
                      {step === 3 && "Métrica"}
                      {step === 4 && "Filtros"}
                      {step === 5 && "Visualizar"}
                      {step === 6 && "Salvar"}
                    </p>
                  </div>
                  {step < totalSteps && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        currentStep > step ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
        </div>
              );
            })}
      </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Step 1: Nome e Fonte de Dados */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 1: Nome e Fonte de Dados</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Defina o nome do relatório e escolha a fonte de dados
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">Nome do Relatório *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Agências com Mais Pontos"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Escolha um nome descritivo para identificar o relatório
              </p>
            </div>

            <div>
              <Label htmlFor="sourceTable">Fonte de Dados *</Label>
              <Select value={sourceTable} onValueChange={setSourceTable}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione a fonte de dados" />
                </SelectTrigger>
                <SelectContent>
                  {tableOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Escolha a tabela principal que contém os dados do relatório
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Relatório Público</Label>
                <p className="text-xs text-muted-foreground">
                  Permitir que outros usuários adicionem este relatório aos seus dashboards
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNextStep} disabled={!canProceedFromStep(1)}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Selecionar Colunas */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Passo 2: Selecionar Colunas *</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {config.metrics && config.metrics.length > 0
                    ? "Escolha as colunas para agrupar os dados (ex: Agência, Filial)"
                    : "Escolha as colunas que você quer ver no relatório (ex: Agência, Filial, Pontos)"}
                </p>
              </div>
              <Button variant="outline" onClick={handlePreviousStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingFields ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 text-sm">
                    {getTableDisplayName(sourceTable)}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableFields.dimensions.map((field) => (
                      <div
                        key={field}
                        className="flex items-center space-x-2 p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleColumn(field)}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedColumns.includes(field)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {selectedColumns.includes(field) && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <Label className="cursor-pointer font-normal">{field}</Label>
                      </div>
                    ))}
                </div>
                </div>

                {availableFields.relatedTables && availableFields.relatedTables.length > 0 && (
                  <>
                    {availableFields.relatedTables.map((relatedTable) => (
                      <div key={relatedTable.key}>
                        <h4 className="font-semibold mb-3 text-sm">{relatedTable.alias}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {relatedTable.fields.map((field) => {
                            const columnValue = `${relatedTable.key}.${field}`;
                            return (
                              <div
                                key={columnValue}
                                className="flex items-center space-x-2 p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                                onClick={() => toggleColumn(columnValue)}
                              >
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    selectedColumns.includes(columnValue)
                                      ? "bg-primary border-primary"
                                      : "border-muted-foreground"
                                  }`}
                                >
                                  {selectedColumns.includes(columnValue) && (
                                    <Check className="w-3 h-3 text-primary-foreground" />
                                  )}
                </div>
                                <Label className="cursor-pointer font-normal">{field}</Label>
                </div>
                            );
                          })}
                        </div>
              </div>
            ))}
                  </>
                )}

                {selectedColumns.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Você precisa selecionar pelo menos uma coluna para exibir no relatório.
                      {config.metrics && config.metrics.length > 0 && " Quando usa métricas agregadas, é necessário agrupar por colunas."}
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button onClick={handleNextStep} disabled={!canProceedFromStep(2)}>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Selecionar Métrica (Opcional) */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Passo 3: Selecionar Métrica (Opcional)</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Opcional: Escolha um campo para calcular (soma ou contagem). Você pode pular este passo.
                </p>
              </div>
              <Button variant="outline" onClick={handlePreviousStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingFields ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div>
                  <Label>Campo para Calcular (Opcional)</Label>
                    <Select
                    value={config.metrics?.[0]?.field || undefined}
                    onValueChange={(value) => {
                      if (value && value !== "none") {
                        setConfig({
                          ...config,
                          metrics: [{ field: value, operation: "SUM", alias: "" }],
                        });
                      } else {
                        setConfig({ ...config, metrics: [] });
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione um campo numérico" />
                      </SelectTrigger>
                      <SelectContent>
                      {availableFields.metrics.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum campo numérico disponível nesta tabela
                        </SelectItem>
                      ) : (
                        availableFields.metrics.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))
                        )}
                      </SelectContent>
                    </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Opcional: Selecione um campo numérico para somar ou contar. Se não selecionar, apenas listará os dados.
                  </p>
                  </div>

                {config.metrics?.[0]?.field && (
                  <>
                    <div>
                      <Label>Operação *</Label>
                      <Select
                        value={config.metrics[0].operation}
                        onValueChange={(value: "SUM" | "COUNT") => {
                          setConfig({
                            ...config,
                            metrics: [
                              {
                                field: config.metrics[0].field,
                                operation: value,
                                alias: config.metrics[0].alias || "",
                              },
                            ],
                          });
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SUM">Somar (Total)</SelectItem>
                          <SelectItem value="COUNT">Contar (Quantidade)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.metrics[0].operation === "SUM"
                          ? "Soma todos os valores do campo"
                          : "Conta quantos registros existem"}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="metricAlias">Nome da Métrica</Label>
                      <Input
                        id="metricAlias"
                        placeholder={
                          config.metrics[0].operation === "SUM"
                            ? `Ex: Total de ${config.metrics[0].field}`
                            : `Ex: Contagem de ${config.metrics[0].field}`
                        }
                        value={config.metrics[0].alias || ""}
                        onChange={(e) => {
                          setConfig({
                            ...config,
                            metrics: [
                              {
                                ...config.metrics[0],
                                alias: e.target.value.trim(),
                              },
                            ],
                          });
                        }}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nome que aparecerá na tabela. Se deixar em branco, será usado um nome padrão.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-4">
                  <Button onClick={handleNextStep} disabled={!canProceedFromStep(3)}>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Adicionar Filtros */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Passo 4: Adicionar Filtros (Opcional)</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Adicione condições para filtrar os dados do relatório
                </p>
              </div>
              <Button variant="outline" onClick={handlePreviousStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(config.filters || []).map((filter, index) => (
              <div key={index} className="flex gap-2 items-end p-4 border rounded-lg">
                <div className="flex-1">
                  <Label>Campo</Label>
                  <Select
                    value={filter.field}
                    onValueChange={(value) =>
                      updateFilter(index, value, filter.operator, filter.value)
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione um campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__main__" disabled>
                        <span className="font-semibold">
                          {getTableDisplayName(sourceTable)}
                        </span>
                      </SelectItem>
                      {availableFields.dimensions.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
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
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="=">=</SelectItem>
                      <SelectItem value="!=">!=</SelectItem>
                      <SelectItem value=">">&gt;</SelectItem>
                      <SelectItem value="<">&lt;</SelectItem>
                      <SelectItem value=">=">&gt;=</SelectItem>
                      <SelectItem value="<=">&lt;=</SelectItem>
                      <SelectItem value="LIKE">Contém</SelectItem>
                      <SelectItem value="IS NULL">É vazio</SelectItem>
                      <SelectItem value="IS NOT NULL">Não é vazio</SelectItem>
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
                    className="mt-2"
                    disabled={filter.operator === "IS NULL" || filter.operator === "IS NOT NULL"}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilter(index)}
                  className="mt-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {(!config.filters || config.filters.length === 0) && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  Nenhum filtro adicionado. Os filtros são opcionais.
                </p>
              </div>
            )}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={addFilter}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Filtro
              </Button>
              <Button onClick={handleNextStep}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Ordenação e Visualização */}
      {currentStep === 5 && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                <CardTitle>Passo 5: Ordenação e Visualização</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure como os dados serão ordenados e exibidos
                </p>
              </div>
              <Button variant="outline" onClick={handlePreviousStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
            </Button>
          </div>
        </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Ordenação */}
              <Card>
                <CardHeader>
                  <CardTitle>Ordenar Por (Opcional)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ordene os resultados por uma coluna ou métrica
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Campo para Ordenar</Label>
                <Select
                      value={config.sort?.[0]?.field || undefined}
                      onValueChange={(value) => {
                        if (value && value !== "none") {
                          setConfig({
                            ...config,
                            sort: [{ field: value, direction: "DESC" }],
                          });
                        } else {
                          setConfig({ ...config, sort: [] });
                        }
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Nenhuma ordenação" />
                  </SelectTrigger>
                  <SelectContent>
                        <SelectItem value="none">Nenhuma ordenação</SelectItem>
                        {/* Opções de ordenação: dimensões selecionadas */}
                        {selectedColumns.map((col) => {
                          const parts = col.split(".");
                          const fieldName = parts.length > 1 ? parts[1] : col;
                          return (
                            <SelectItem key={col} value={col}>
                              {fieldName}
                      </SelectItem>
                          );
                        })}
                        {/* Opções de ordenação: métricas */}
                        {config.metrics && config.metrics.length > 0 && (
                          <>
                            {config.metrics.map((metric, idx) => {
                              const metricLabel = metric.alias || `${metric.operation}(${metric.field})`;
                              return (
                                <SelectItem key={`metric-${idx}`} value={metric.field}>
                                  {metricLabel}
                                </SelectItem>
                              );
                            })}
                          </>
                        )}
                  </SelectContent>
                </Select>
              </div>
                  {config.sort?.[0]?.field && (
                    <div>
                      <Label>Ordem</Label>
                <Select
                        value={config.sort[0].direction}
                        onValueChange={(value: "ASC" | "DESC") => {
                          setConfig({
                            ...config,
                            sort: [{ field: config.sort[0].field, direction: value }],
                          });
                        }}
                      >
                        <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                          <SelectItem value="DESC">Maior para Menor</SelectItem>
                          <SelectItem value="ASC">Menor para Maior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                  )}
                  {config.sort?.[0]?.field && config.metrics && config.metrics.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-xs text-blue-800">
                        💡 Quando ordenar por métrica, você deve definir um limite de resultados abaixo.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Visualização e Limite */}
              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Visualização</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Como os dados serão exibidos
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Tipo de Gráfico *</Label>
                    <Select
                      value={visualizationType}
                      onValueChange={setVisualizationType}
                    >
                      <SelectTrigger className="mt-2">
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
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Quantidade máxima de linhas (1 a 10.000)
                    </p>
                  </div>
        </CardContent>
      </Card>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNextStep} disabled={!canProceedFromStep(5)}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Preview e Salvar */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Passo 6: Preview e Salvar</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Visualize os dados e salve o relatório
                </p>
              </div>
              <Button variant="outline" onClick={handlePreviousStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configuração de Agrupamento */}
            {selectedColumns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Agrupamento de Dados</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Selecione quais colunas usar para agrupar os dados. Se não selecionar nenhuma, os dados serão listados sem agrupamento.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedColumns.map((col) => {
                      const parts = col.split(".");
                      const fieldName = parts.length > 1 ? parts[1] : col;
                      const isGrouped = config.dimensions?.some((d) => d.field === col) || false;
                      
                      return (
                        <div
                          key={col}
                          className="flex items-center space-x-2 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            if (isGrouped) {
                              // Remover do agrupamento
                              setConfig({
                                ...config,
                                dimensions: config.dimensions?.filter((d) => d.field !== col) || [],
                              });
                            } else {
                              // Adicionar ao agrupamento
                              setConfig({
                                ...config,
                                dimensions: [
                                  ...(config.dimensions || []),
                                  { field: col, alias: "" },
                                ],
                              });
                            }
                          }}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isGrouped
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isGrouped && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>
                          <Label className="cursor-pointer font-normal flex-1">
                            {fieldName}
                          </Label>
                          {isGrouped && (
                            <Badge variant="secondary" className="text-xs">
                              Agrupar
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(!config.dimensions || config.dimensions.length === 0) && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-xs text-blue-800">
                        💡 Nenhuma coluna selecionada para agrupamento. Os dados serão listados sem agrupar.
                        {config.metrics && config.metrics.length > 0 && (
                          <span className="block mt-1">
                            ⚠️ Se você tem métricas (soma/contagem), é recomendado selecionar pelo menos uma coluna para agrupar.
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handlePreview} disabled={isLoadingPreview}>
                {isLoadingPreview ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Gerar Preview
              </Button>
            </div>

            {/* Preview dos Dados */}
            {previewData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Preview dos Dados</h4>
                      <p className="text-sm text-muted-foreground">
                        Mostrando {Math.min(10, previewData.length)} de {previewData.length} resultados
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Pencil className="h-3 w-3" />
                      <span>Clique nos nomes das colunas para editá-los</span>
                    </div>
                  </div>
                </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(previewData[0] || {}).map((key) => {
                      const isEditing = editingColumn === key;
                      const displayName = columnAliases[key] || key;
                      
                      return (
                        <TableHead key={key} className="relative group min-w-[150px]">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={columnAliases[key] || key}
                                onChange={(e) => {
                                  setColumnAliases((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    applyColumnAlias(key, columnAliases[key] || key);
                                    setEditingColumn(null);
                                  } else if (e.key === "Escape") {
                                    setEditingColumn(null);
                                    // Restaurar o valor original
                                    const field = findFieldForColumn(key);
                                    if (field.type === 'metric' && config.metrics?.[field.index]?.alias) {
                                      setColumnAliases((prev) => ({
                                        ...prev,
                                        [key]: config.metrics[field.index].alias,
                                      }));
                                    } else if (field.type === 'dimension' && config.dimensions?.[field.index]?.alias) {
                                      setColumnAliases((prev) => ({
                                        ...prev,
                                        [key]: config.dimensions[field.index].alias,
                                      }));
                                    } else {
                                      setColumnAliases((prev) => ({
                                        ...prev,
                                        [key]: key,
                                      }));
                                    }
                                  }
                                }}
                                onBlur={() => {
                                  applyColumnAlias(key, columnAliases[key] || key);
                                  setEditingColumn(null);
                                }}
                                autoFocus
                                className="h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  applyColumnAlias(key, columnAliases[key] || key);
                                  setEditingColumn(null);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="flex items-center gap-2 group-hover:bg-muted/50 p-1 rounded cursor-pointer" 
                              onClick={() => setEditingColumn(key)}
                            >
                              <span className="flex-1">{displayName}</span>
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {Object.keys(previewData[0] || {}).map((key) => {
                        const displayName = columnAliases[key] || key;
                        const value = row[key];
                        return (
                          <TableCell key={key}>
                            {value !== null && value !== undefined
                              ? String(value)
                              : "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
              </div>
            )}

            {previewData.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Clique em "Gerar Preview" para visualizar os dados do relatório
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={isSaving} size="lg">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? "Atualizar Relatório" : "Salvar Relatório"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default AdminReportBuilder;
