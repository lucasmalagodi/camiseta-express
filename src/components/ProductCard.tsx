import { Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPoints } from "@/lib/utils";

interface ProductCardProps {
  id: number;
  image: string;
  name: string;
  price: number;
  originalPrice?: number;
  delay?: number;
  quantity?: number;
  podeComprar?: boolean;
}

const ProductCard = ({ id, image, name, price, originalPrice, delay = 0, quantity, podeComprar = true }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addItem } = useCart();
  const navigate = useNavigate();

  const isOutOfStock = quantity !== undefined && quantity === 0;
  const canPurchase = podeComprar && !isOutOfStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) {
      toast.error("Produto esgotado");
      return;
    }
    if (!podeComprar) {
      toast.error("Limite de compra atingido para este produto");
      return;
    }
    addItem({
      id,
      name,
      image,
      price,
      originalPrice,
    });
    toast.success(`${name} adicionado ao carrinho!`);
  };

  const handleCardClick = () => {
    navigate(`/product/${id}`);
  };

  return (
    <div
      className="group relative rounded-2xl bg-card border border-border overflow-hidden card-shadow animate-scale-in cursor-pointer"
      style={{ animationDelay: `${delay}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
        <img
          src={image}
          alt={name}
          className={`relative w-full h-full object-contain transition-transform duration-500 ${
            isHovered ? "scale-110" : "scale-100"
          }`}
        />

        {/* Add Button */}
        {canPurchase && (
          <button
            onClick={handleAddToCart}
            className={`absolute bottom-4 right-4 add-button transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Plus className="w-5 h-5 text-foreground" />
          </button>
        )}

        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            Esgotado
          </div>
        )}

        {/* Purchase Limit Reached Badge */}
        {!isOutOfStock && !podeComprar && (
          <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-yellow-500 text-yellow-50 text-xs font-semibold flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            Limite Atingido
          </div>
        )}

        {/* Discount Badge */}
        {originalPrice && Number(originalPrice) > Number(price) && (
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full hero-gradient text-xs font-semibold text-primary-foreground">
            -{Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100)}%
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
          {name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPoints(Number(price || 0))} pts
          </span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPoints(Number(originalPrice || 0))} pts
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
