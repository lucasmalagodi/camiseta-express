import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, BarChart3, Eye, X, GripVertical, Lock, Maximize2 } from "lucide-react";
import { reportService } from "@/services/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer } from "recharts";

interface ReportWidgetProps {
  widgetId?: number;
  reportId: number;
  reportName: string;
  visualizationType: string;
  onRefresh?: () => void;
  onRemove?: (widgetId: number) => Promise<void> | void;
  isLocked?: boolean;
  expanded?: number; // 0 = 1 col, 1 = 2 cols, 2 = 3 cols
  onToggleExpand?: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const ReportWidget = ({ widgetId, reportId, reportName, visualizationType, onRefresh, onRemove, isLocked = false, expanded = 0, onToggleExpand }: ReportWidgetProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [reportId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const result = await reportService.execute(reportId);
      setData(result);
    } catch (error: any) {
      console.error("Erro ao carregar dados do widget:", error);
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadData();
      if (onRefresh) onRefresh();
      toast.success("Dados atualizados");
    } catch (error: any) {
      console.error("Erro ao atualizar dados:", error);
      toast.error(error.message || "Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderVisualization = () => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
        </div>
      );
    }

    if (!data[0] || Object.keys(data[0]).length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Dados inválidos</p>
        </div>
      );
    }

    const allKeys = Object.keys(data[0]);
    const firstKey = allKeys[0];
    const metricKeys = allKeys.slice(1); // Todas as chaves exceto a primeira

    switch (visualizationType) {
      case "table":
        return (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(data[0] || {}).map((key) => (
                    <TableHead key={key} className="text-xs">{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 5).map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value: any, i) => (
                      <TableCell key={i} className="text-xs">
                        {value !== null && value !== undefined
                          ? String(value)
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Mostrando 5 de {data.length} resultados
              </p>
            )}
          </div>
        );

      case "bar":
        return (
          <ChartContainer
            config={{
              [metricKeys[0] || "value"]: {
                label: metricKeys[0] || "Valor",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={firstKey}
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {metricKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "line":
        return (
          <ChartContainer
            config={{
              [metricKeys[0] || "value"]: {
                label: metricKeys[0] || "Valor",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={firstKey}
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {metricKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "pie":
        return (
          <ChartContainer
            config={{
              [firstKey || "name"]: {
                label: firstKey || "Nome",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey={metricKeys[0] || "value"}
                  nameKey={firstKey}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "area":
        return (
          <ChartContainer
            config={{
              [metricKeys[0] || "value"]: {
                label: metricKeys[0] || "Valor",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={firstKey}
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {metricKeys.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Tipo de visualização não suportado
            </p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-indigo-500 h-full max-h-[600px] overflow-hidden flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {reportName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-indigo-500 h-full max-h-[600px] overflow-hidden flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 relative group">
        <CardTitle className="text-sm font-medium flex items-center gap-2 flex-1">
          {!isLocked ? (
            <div
              className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
              draggable={false}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
          <BarChart3 className="h-4 w-4" />
          {reportName}
          {expanded > 0 && (
            <Badge variant="outline" className="text-xs">
              {expanded === 1 ? '2 cols' : '3 cols'}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleExpand}
              disabled={isLocked}
              title={
                isLocked 
                  ? "Movimentações travadas"
                  : expanded === 0 
                    ? "Expandir para 2 colunas"
                    : expanded === 1 
                      ? "Expandir para 3 colunas"
                      : "Voltar para 1 coluna"
              }
            >
              <Maximize2 className={`h-4 w-4 ${isLocked ? 'opacity-50' : ''}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Atualizar"
          >
            {isRefreshing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => navigate(`/admin/relatorios/${reportId}`)}
            title="Ver detalhes"
          >
            <Eye className="h-3 w-3" />
          </Button>
          {onRemove && widgetId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.confirm("Tem certeza que deseja remover este widget do dashboard?")) {
                  try {
                    await onRemove(widgetId);
                  } catch (error) {
                    console.error("Erro ao remover widget:", error);
                  }
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              title="Remover do dashboard"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="w-full h-full min-h-[250px]">
          {renderVisualization()}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportWidget;
