import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Função helper para calcular distribuição de unidades pelos lotes
export const calculateLotDistribution = (
  quantity: number,
  prices: Array<{ id: number; value: number; batch: number; quantidadeCompra: number }>,
  agencyPurchaseCount: number = 0,
  purchasesByLot: Array<{ priceId: number; batch: number; units: number }> = []
): { distribution: LotDistribution[]; totalPrice: number; canAdd: boolean } => {
  // Ordenar preços por batch
  const sortedPrices = [...prices].sort((a, b) => a.batch - b.batch);
  
  const distribution: LotDistribution[] = [];
  let remainingQuantity = quantity;
  let totalPrice = 0;
  let totalUnitsPurchased = agencyPurchaseCount;
  
  // Criar mapa de compras por lote para facilitar busca
  const purchasesByLotMap = new Map<number, number>();
  purchasesByLot.forEach(p => {
    purchasesByLotMap.set(p.priceId, p.units);
  });
  
  // Distribuir unidades pelos lotes
  for (let i = 0; i < sortedPrices.length && remainingQuantity > 0; i++) {
    const price = sortedPrices[i];
    const quantidadeCompra = Number(price.quantidadeCompra) || 0;
    
    let unitsForThisLot = 0;
    
    if (quantidadeCompra === 0) {
      // Se quantidade_compra = 0: permite apenas 1 unidade por agência (qualquer lote)
      if (totalUnitsPurchased === 0 && remainingQuantity > 0) {
        unitsForThisLot = 1;
      }
      // Se já comprou, não pode mais comprar neste lote
    } else {
      // Se quantidade_compra > 0: permite até quantidade_compra unidades neste lote
      const lotUnitsPurchased = purchasesByLotMap.get(price.id) || 0;
      const availableInLot = quantidadeCompra - lotUnitsPurchased;
      
      if (availableInLot > 0) {
        unitsForThisLot = Math.min(remainingQuantity, availableInLot);
      }
    }
    
    if (unitsForThisLot > 0) {
      distribution.push({
        priceId: price.id,
        batch: price.batch,
        value: Number(price.value),
        quantity: unitsForThisLot,
        quantidadeCompra: quantidadeCompra
      });
      
      totalPrice += Number(price.value) * unitsForThisLot;
      remainingQuantity -= unitsForThisLot;
      totalUnitsPurchased += unitsForThisLot;
    }
  }
  
  // Se ainda há unidades restantes, não pode adicionar tudo
  const canAdd = remainingQuantity === 0;
  
  return { distribution, totalPrice, canAdd };
};

export interface LotDistribution {
  priceId: number;
  batch: number;
  value: number;
  quantity: number;
  quantidadeCompra: number;
}

export interface CartItem {
  id: number;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  // Informações de lotes
  prices?: Array<{
    id: number;
    value: number;
    batch: number;
    quantidadeCompra: number;
  }>;
  lotDistribution?: LotDistribution[]; // Distribuição de unidades por lote
  agencyPurchaseCount?: number; // Total de unidades já compradas pela agência
  purchasesByLot?: Array<{ priceId: number; batch: number; units: number }>; // Compras por lote
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Carregar dados do localStorage ao inicializar
  useEffect(() => {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) {
      setItems(JSON.parse(storedCart));
    }
  }, []);

  // Salvar no localStorage sempre que o carrinho mudar
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      
      if (existingItem) {
        // Se já existe, incrementar quantidade e recalcular distribuição
        const newQuantity = existingItem.quantity + 1;
        
        // Se tem informações de lotes, recalcular distribuição
        // Considerar apenas compras confirmadas anteriores (não unidades do carrinho)
        if (item.prices && item.prices.length > 0) {
          const { distribution, totalPrice, canAdd } = calculateLotDistribution(
            newQuantity,
            item.prices,
            item.agencyPurchaseCount || 0,
            item.purchasesByLot || []
          );
          
          if (!canAdd) {
            // Não pode adicionar mais unidades
            return prevItems;
          }
          
          return prevItems.map((i) =>
            i.id === item.id ? {
              ...i,
              quantity: newQuantity,
              lotDistribution: distribution,
              price: totalPrice / newQuantity, // Preço médio
              prices: item.prices, // Manter preços atualizados
              agencyPurchaseCount: item.agencyPurchaseCount,
              purchasesByLot: item.purchasesByLot
            } : i
          );
        }
        
        // Se não tem lotes, apenas incrementar
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        );
      }
      
      // Novo item - calcular distribuição se tiver lotes
      let newItem: CartItem = { ...item, quantity: 1 };
      
      if (item.prices && item.prices.length > 0) {
        const { distribution, totalPrice, canAdd } = calculateLotDistribution(
          1,
          item.prices,
          item.agencyPurchaseCount || 0,
          item.purchasesByLot || []
        );
        
        if (!canAdd) {
          // Não pode adicionar
          return prevItems;
        }
        
        newItem = {
          ...item,
          quantity: 1,
          lotDistribution: distribution,
          price: totalPrice
        };
      }
      
      return [...prevItems, newItem];
    });
  };

  const removeItem = (id: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;
        
        // Se tem informações de lotes, recalcular distribuição
        if (item.prices && item.prices.length > 0) {
          // Considerar apenas as compras anteriores (não incluir unidades do carrinho atual)
          const { distribution, totalPrice, canAdd } = calculateLotDistribution(
            quantity,
            item.prices,
            item.agencyPurchaseCount || 0,
            item.purchasesByLot || []
          );
          
          if (!canAdd) {
            // Não pode atualizar para essa quantidade
            return item;
          }
          
          return {
            ...item,
            quantity,
            lotDistribution: distribution,
            price: totalPrice / quantity // Preço médio
          };
        }
        
        // Se não tem lotes, apenas atualizar quantidade
        return { ...item, quantity };
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    // Se tem distribuição de lotes, usar o preço calculado
    if (item.lotDistribution && item.lotDistribution.length > 0) {
      const itemTotal = item.lotDistribution.reduce(
        (lotSum, lot) => lotSum + (lot.value * lot.quantity),
        0
      );
      return sum + itemTotal;
    }
    // Caso contrário, usar preço simples
    return sum + item.price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart deve ser usado dentro de um CartProvider");
  }
  return context;
};
