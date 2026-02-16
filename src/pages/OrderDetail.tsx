import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Package } from "lucide-react";
import { orderService } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatPoints } from "@/lib/utils";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  pointsPerUnit: number;
  productName: string;
  model: string | null;
  size: string | null;
}

interface Order {
  id: number;
  agencyId: number;
  totalPoints: number;
  status: "PENDING" | "CONFIRMED" | "CANCELED";
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agency) {
      toast.error("Você precisa estar logado para ver os detalhes do pedido");
      navigate("/login");
      return;
    }

    if (!id) return;

    loadOrderDetails();
  }, [id, agency]);

  const loadOrderDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const orderData = await orderService.getMyOrderById(Number(id));
      setOrder(orderData);
    } catch (error: any) {
      console.error("Erro ao carregar detalhes do pedido:", error);
      toast.error(error.message || "Erro ao carregar detalhes do pedido");
      navigate("/pedidos");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-500 hover:bg-green-600">Confirmado</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case "CANCELED":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Pedido não encontrado</h3>
            <p className="text-muted-foreground mb-6">
              O pedido solicitado não foi encontrado ou não pertence à sua agência.
            </p>
            <Button onClick={() => navigate("/pedidos")}>
              Voltar para Meus Pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/pedidos")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Pedido #{order.id}</h1>
            <p className="text-muted-foreground mt-1">
              Detalhes completos do pedido
            </p>
          </div>
        </div>
      </div>

      {/* Order Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Informações do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">ID:</span>
              <p className="font-medium">#{order.id}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="mt-1">{getStatusBadge(order.status)}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Total:</span>
              <p className="font-bold text-primary text-lg">
                {formatPoints(order.totalPoints).toLocaleString("pt-BR")} pts
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Itens:</span>
              <p className="font-medium">{order.items.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <span className="text-sm text-muted-foreground">Criado em:</span>
              <p className="text-sm">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Atualizado em:</span>
              <p className="text-sm">{formatDate(order.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-right">Pontos/Unidade</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.model || "-"}</TableCell>
                    <TableCell>{item.size || "-"}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatPoints(item.pointsPerUnit).toLocaleString("pt-BR")} pts
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatPoints(item.pointsPerUnit * item.quantity).toLocaleString("pt-BR")} pts
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={5} className="text-right font-bold">
                    Total:
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {formatPoints(order.totalPoints).toLocaleString("pt-BR")} pts
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetail;
