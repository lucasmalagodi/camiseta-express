import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { orderService } from "@/services/api";
import { productService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatPoints } from "@/lib/utils";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  pointsPerUnit: number;
}

interface Order {
  id: number;
  agencyId: number;
  totalPoints: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

const CheckoutConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { forceRefreshPoints } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        navigate("/cart");
        return;
      }

      try {
        const orderData = await orderService.getById(Number(orderId));
        setOrder(orderData);

        // Buscar detalhes dos produtos
        const productIds = orderData.items.map((item: OrderItem) => item.productId);
        const productPromises = productIds.map((id: number) => productService.getById(id));
        const productResults = await Promise.all(productPromises);
        
        const productsMap: Record<number, any> = {};
        productResults.forEach((product: any) => {
          productsMap[product.id] = product;
        });
        setProducts(productsMap);

        // Atualizar pontos após carregar o pedido (forçar atualização sem cooldown)
        try {
          await forceRefreshPoints();
        } catch (error) {
          console.error("Erro ao atualizar pontos:", error);
          // Não bloquear o fluxo se a atualização de pontos falhar
        }
      } catch (error) {
        console.error("Erro ao buscar pedido:", error);
        navigate("/cart");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate, forceRefreshPoints]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="pt-32 pb-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Success Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pedido Confirmado!
          </h1>
          <p className="text-muted-foreground text-center">
            Seu pedido #{order.id} foi processado com sucesso
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Detalhes do Pedido</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número do Pedido:</span>
              <span className="font-medium">#{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">
                {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {order.status === "CONFIRMED" ? "Confirmado" : order.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-primary text-lg">
                {formatPoints(order.totalPoints)} pts
              </span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Itens do Pedido</h2>
          
          <div className="space-y-4">
            {order.items.map((item) => {
              const product = products[item.productId];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {product?.name || `Produto #${item.productId}`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Quantidade: {item.quantity} × {formatPoints(item.pointsPerUnit)} pts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      {formatPoints(item.quantity * item.pointsPerUnit)} pts
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate("/checkout/instructions")}
            size="lg"
            className="w-full"
          >
            Ver Instruções
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="w-full"
          >
            Voltar para Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutConfirmation;
