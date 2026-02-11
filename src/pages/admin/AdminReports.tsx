import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Eye, BarChart3 } from "lucide-react";
import { reportService } from "@/services/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Report {
  id: number;
  name: string;
  sourceTable: string;
  visualizationType: string;
  configJson: any;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

const AdminReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const data = await reportService.getAll();
      setReports(data);
    } catch (error: any) {
      console.error("Erro ao carregar relatórios:", error);
      toast.error(error.message || "Erro ao carregar relatórios");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;

    try {
      await reportService.delete(reportToDelete);
      toast.success("Relatório deletado com sucesso");
      loadReports();
    } catch (error: any) {
      console.error("Erro ao deletar relatório:", error);
      toast.error(error.message || "Erro ao deletar relatório");
    } finally {
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const getVisualizationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      table: "Tabela",
      bar: "Gráfico de Barras",
      line: "Gráfico de Linha",
      pie: "Gráfico de Pizza",
      area: "Gráfico de Área",
    };
    return labels[type] || type;
  };

  const getSourceTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      agency_points_import_items: "Itens de Importação",
      agencies: "Agências",
      agency_points_ledger: "Ledger de Pontos",
      orders: "Pedidos",
      order_items: "Itens de Pedido",
    };
    return labels[table] || table;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Relatórios</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Relatórios</h2>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie relatórios dinâmicos do sistema
          </p>
        </div>
        <Button onClick={() => navigate("/admin/relatorios/novo")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lista de Relatórios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum relatório criado ainda
              </p>
              <Button onClick={() => navigate("/admin/relatorios/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Relatório
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fonte de Dados</TableHead>
                  <TableHead>Tipo de Visualização</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getSourceTableLabel(report.sourceTable)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getVisualizationTypeLabel(report.visualizationType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/relatorios/${report.id}`)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/relatorios/${report.id}/editar`)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setReportToDelete(report.id);
                            setDeleteDialogOpen(true);
                          }}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este relatório? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReports;
