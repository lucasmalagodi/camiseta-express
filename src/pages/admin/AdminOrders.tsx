import { useCallback, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, Package } from "lucide-react";
import {
  shipmentService,
  ShipmentStatus,
} from "@/services/api";
import { toast } from "sonner";
import { formatPoints } from "@/lib/utils";
import { useTableSort } from "@/hooks/useTableSort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminOrderRow = {
  id: number;
  agencyId: number;
  agencyName?: string;
  totalPoints: number;
  createdAt: string;
  productsSummary?: string;
  shipmentStatus?: ShipmentStatus;
};

const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  PENDING: "Pendente",
  READY_TO_POST: "Pronto para postar",
  POSTED: "Postado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

const shipmentStatusVariant = (s: ShipmentStatus) => {
  switch (s) {
    case "DELIVERED":
      return "default" as const;
    case "POSTED":
      return "secondary" as const;
    case "CANCELED":
      return "destructive" as const;
    case "READY_TO_POST":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<AdminOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"unprocessed" | "processed">("unprocessed");
  const [processedStatus, setProcessedStatus] = useState<string>("all");
  
  const { sortedData, handleSort, getSortIcon } = useTableSort(filteredOrders);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      if (viewMode === "unprocessed") {
        const data = await shipmentService.listPendingOrders();
        setOrders(data as AdminOrderRow[]);
        setFilteredOrders(data as AdminOrderRow[]);
      } else {
        const data = await shipmentService.listProcessedOrders({
          status: processedStatus === "all" ? undefined : (processedStatus as ShipmentStatus),
        });
        setOrders(data as AdminOrderRow[]);
        setFilteredOrders(data as AdminOrderRow[]);
      }
    } catch (error) {
      toast.error("Erro ao carregar pedidos");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [processedStatus, viewMode]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = orders.filter((order) => {
      const agencyName = order.agencyName?.toLowerCase() || "";
      return (
        order.id.toString().includes(term) ||
        order.agencyId.toString().includes(term) ||
        agencyName.includes(term) ||
        (order.productsSummary && order.productsSummary.toLowerCase().includes(term)) ||
        (order.shipmentStatus && order.shipmentStatus.toLowerCase().includes(term))
      );
    });
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  const getShipmentStatusBadge = (row: AdminOrderRow) => {
    if (viewMode === "unprocessed") {
      return <Badge variant="outline">Não processado</Badge>;
    }

    return (
      <div className="flex flex-col gap-1">
        <Badge variant="secondary">Enviado</Badge>
        {row.shipmentStatus && (
          <span className="text-xs text-muted-foreground">
            Remessa: {shipmentStatusLabel[row.shipmentStatus]}
          </span>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-1">
            Visualize pedidos não processados e, quando necessário, filtre os processados por status do envio.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 min-w-[200px]">
              <Label>Exibir</Label>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unprocessed">Não processados</SelectItem>
                  <SelectItem value="processed">Processados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {viewMode === "processed" && (
              <div className="space-y-2 min-w-[220px]">
                <Label>Status do envio</Label>
                <Select value={processedStatus} onValueChange={setProcessedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(Object.keys(shipmentStatusLabel) as ShipmentStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {shipmentStatusLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={
                  viewMode === "processed"
                    ? "Buscar por ID, agência, status do envio ou produto..."
                    : "Buscar por ID, agência ou produto..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Lista de Pedidos ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum pedido encontrado" : "Nenhum pedido registrado"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("id")}
                    >
                      ID{getSortIcon("id")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("agencyName")}
                    >
                      Agência{getSortIcon("agencyName")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("totalPoints")}
                    >
                      Total (pts){getSortIcon("totalPoints")}
                    </TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("shipmentStatus")}
                    >
                      Status do envio{getSortIcon("shipmentStatus")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("createdAt")}
                    >
                      Data{getSortIcon("createdAt")}
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {order.agencyName || `Agência ${order.agencyId}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ID: {order.agencyId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatPoints(order.totalPoints)} pts
                      </TableCell>
                      <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                        {order.productsSummary || "—"}
                      </TableCell>
                      <TableCell>{getShipmentStatusBadge(order)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/pedidos/${order.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrders;
