import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";
import { orderService } from "@/services/api";
import { useState } from "react";
import { toast } from "sonner";
import { formatPoints } from "@/lib/utils";

const Cart = () => {
  const { items, updateQuantity, removeItem, totalPrice, totalItems, clearCart } =
    useCart();
  const { agency, isAuthenticated, forceRefreshPoints } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!isAuthenticated || !agency) {
      toast.error("Você precisa estar logado para finalizar a compra");
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    setIsProcessing(true);

    try {
      // Preparar itens para o checkout (apenas productId e quantity)
      const checkoutItems = items.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }));

      const result = await orderService.create(agency.id, checkoutItems);
      
      // Limpar carrinho após sucesso
      clearCart();
      
      // Atualizar pontos após checkout bem-sucedido (forçar atualização sem cooldown)
      try {
        await forceRefreshPoints();
      } catch (error) {
        console.error("Erro ao atualizar pontos após checkout:", error);
        // Não bloquear o fluxo se a atualização de pontos falhar
      }
      
      // Redirecionar para página de confirmação
      navigate(`/checkout/confirmation/${result.id}`);
    } catch (error: any) {
      console.error("Erro ao finalizar compra:", error);
      
      // Mensagens de erro específicas
      if (error.message.includes("Insufficient stock")) {
        toast.error("Alguns produtos estão fora de estoque. Por favor, verifique seu carrinho.");
      } else if (error.message.includes("Insufficient points")) {
        toast.error("Pontos insuficientes para finalizar a compra.");
      } else if (error.message.includes("not found") || error.message.includes("inactive")) {
        toast.error("Alguns produtos não estão mais disponíveis. Por favor, atualize seu carrinho.");
      } else {
        toast.error(error.message || "Erro ao finalizar compra. Tente novamente.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h1 className="text-3xl font-bold text-foreground">Carrinho</h1>
            <p className="text-muted-foreground mt-2">
              {totalItems === 0
                ? "Seu carrinho está vazio"
                : `${totalItems} ${totalItems === 1 ? "item" : "itens"}`}
            </p>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <ShoppingBag className="w-24 h-24 text-muted-foreground" />
              <div>
                <p className="text-xl font-medium text-foreground">
                  Seu carrinho está vazio
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Adicione produtos para começar
                </p>
              </div>
              <Button onClick={() => navigate("/#produtos")} className="mt-4">
                Ver Produtos
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Items */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden">
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="relative w-full h-full object-contain rounded-lg"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {item.name}
                        </h3>
                        {item.lotDistribution && item.lotDistribution.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {item.lotDistribution.map((lot, idx) => (
                              <p key={idx} className="text-sm text-muted-foreground">
                                {lot.quantity}x {lot.batch}º Lote - {formatPoints(lot.value)} pts/un = {formatPoints(lot.value * lot.quantity)} pts
                              </p>
                            ))}
                            <p className="text-base font-bold text-primary mt-1">
                              Total: {formatPoints(item.lotDistribution.reduce((sum, lot) => sum + (lot.value * lot.quantity), 0))} pts
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-base font-bold text-primary mt-1">
                              {formatPoints(item.price)} pts
                            </p>
                            {item.originalPrice && (
                              <p className="text-sm text-muted-foreground line-through">
                                {formatPoints(item.originalPrice)} pts
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-10 text-center font-medium text-lg">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-lg font-bold text-primary">
                            {item.lotDistribution && item.lotDistribution.length > 0
                              ? formatPoints(item.lotDistribution.reduce((sum, lot) => sum + (lot.value * lot.quantity), 0))
                              : formatPoints(item.price * item.quantity)} pts
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="border-t border-border pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-semibold text-foreground">
                      Total:
                    </span>
                    <span className="text-3xl font-bold text-primary">
                      {formatPoints(totalPrice)} pts
                    </span>
                  </div>
                  {isAuthenticated && agency && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Seus pontos disponíveis:</span>
                      <span className="font-medium">{formatPoints(agency.points)} pts</span>
                    </div>
                  )}
                  {!isAuthenticated && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Você precisa estar logado para finalizar a compra
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/#produtos")}
                  >
                    Continuar Comprando
                  </Button>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearCart}
                    >
                      Limpar Carrinho
                    </Button>
                    <Button 
                      className="flex-1" 
                      size="lg"
                      onClick={handleCheckout}
                      disabled={isProcessing || !isAuthenticated}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        "Finalizar Compra"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default Cart;
