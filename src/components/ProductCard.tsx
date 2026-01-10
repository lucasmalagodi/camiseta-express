import { Plus } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  image: string;
  name: string;
  price: number;
  originalPrice?: number;
  delay?: number;
}

const ProductCard = ({ image, name, price, originalPrice, delay = 0 }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative rounded-2xl bg-card border border-border overflow-hidden card-shadow animate-scale-in"
      style={{ animationDelay: `${delay}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-muted to-secondary">
        <img
          src={image}
          alt={name}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isHovered ? "scale-110" : "scale-100"
          }`}
        />

        {/* Add Button */}
        <button
          className={`absolute bottom-4 right-4 add-button transition-all duration-300 ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Plus className="w-5 h-5 text-foreground" />
        </button>

        {/* Discount Badge */}
        {originalPrice && (
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full hero-gradient text-xs font-semibold text-primary-foreground">
            -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
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
            R${price.toFixed(0)}
          </span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              R${originalPrice.toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
