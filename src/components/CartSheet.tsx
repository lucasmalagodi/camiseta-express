import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPoints, formatModelName } from "@/lib/utils";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCart();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleCheckout = () => {
    onOpenChange(false);
    navigate("/cart");
  };

  if (isMobile) {
    // No mobile, não mostra o sheet, redireciona para a página
    if (open) {
      onOpenChange(false);
      navigate("/cart");
    }
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Carrinho</SheetTitle>
          <SheetDescription>
            {totalItems === 0
              ? "Seu carrinho está vazio"
              : `${totalItems} ${totalItems === 1 ? "item" : "itens"}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <ShoppingBag className="w-16 h-16 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-foreground">
                  Seu carrinho está vazio
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Adicione produtos para começar
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 rounded-lg border border-border bg-card"
                >
                  <div className="relative w-20 h-20 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden">
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="relative w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {item.name}
                      </h3>
                      {item.variantInfo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatModelName(item.variantInfo.model)} - {item.variantInfo.size}
                        </p>
                      )}
                      {item.lotDistribution && item.lotDistribution.length > 0 ? (
                        <div className="mt-1 space-y-0.5">
                          {item.lotDistribution.map((lot, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              {lot.quantity}x {lot.batch}º Lote - {formatPoints(lot.value)} pts/un
                            </p>
                          ))}
                          <p className="text-sm font-bold text-primary mt-1">
                            Total: {formatPoints(item.lotDistribution.reduce((sum, lot) => sum + (lot.value * lot.quantity), 0))} pts
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-primary mt-1">
                          {formatPoints(item.price)} pts
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-foreground">
                Total:
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatPoints(totalPrice)} pts
              </span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
            >
              Finalizar Compra
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
