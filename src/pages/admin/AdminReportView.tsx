import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Loader2, BarChart3 } from "lucide-react";
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer } from "recharts";

interface Report {
  id: number;
  name: string;
  sourceTable: string;
  visualizationType: string;
  configJson: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const AdminReportView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const reportData = await reportService.getById(Number(id));
      setReport(reportData);
      await executeReport(reportData);
    } catch (error: any) {
      console.error("Erro ao carregar relatório:", error);
      toast.error(error.message || "Erro ao carregar relatório");
      navigate("/admin/relatorios");
    } finally {
      setIsLoading(false);
    }
  };

  const executeReport = async (reportData: Report) => {
    try {
      const result = await reportService.execute(reportData.id);
      setData(result);
    } catch (error: any) {
      console.error("Erro ao executar relatório:", error);
      toast.error(error.message || "Erro ao executar relatório");
    }
  };

  const handleRefresh = async () => {
    if (!report) return;
    try {
      setIsRefreshing(true);
      await executeReport(report);
      toast.success("Dados atualizados com sucesso");
    } catch (error: any) {
      console.error("Erro ao atualizar dados:", error);
      toast.error(error.message || "Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderVisualization = () => {
    if (!report || data.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      );
    }

    const firstKey = Object.keys(data[0] || {})[0];
    const metricKeys = Object.keys(data[0] || {}).filter(
      (key) => key !== firstKey
    );

    switch (report.visualizationType) {
      case "table":
        return (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(data[0] || {}).map((key) => (
                    <TableHead key={key}>{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
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
            className="h-[400px]"
          >
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={firstKey}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {metricKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
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
            className="h-[400px]"
          >
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={firstKey}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
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
            className="h-[400px]"
          >
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={120}
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
            className="h-[400px]"
          >
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={firstKey}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
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
          </ChartContainer>
        );

      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Tipo de visualização não suportado: {report.visualizationType}
            </p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Relatório não encontrado</p>
        <Button onClick={() => navigate("/admin/relatorios")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/relatorios")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">{report.name}</h2>
            <p className="text-muted-foreground mt-1">
              {data.length} resultado(s) encontrado(s)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/relatorios/${report.id}/editar`)}
          >
            Editar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Visualização
          </CardTitle>
        </CardHeader>
        <CardContent>{renderVisualization()}</CardContent>
      </Card>
    </div>
  );
};

export default AdminReportView;
