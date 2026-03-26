import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Função helper para calcular distribuição de unidades pelos lotes
export const calculateLotDistribution = (
  quantity: number,
  prices: Array<{ id: number; value: number; batch: number; quantidadeCompra: number }>,
  agencyPurchaseCount: number = 0,
  purchasesByLot: Array<{ priceId: number; batch: number; units: number }> = [],
  loteDisponivelId?: number
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
  
  // Se temos um loteDisponivelId, encontrar seu índice para começar a partir dele
  let startIndex = 0;
  if (loteDisponivelId !== undefined) {
    const loteIndex = sortedPrices.findIndex(p => p.id === loteDisponivelId);
    if (loteIndex !== -1) {
      startIndex = loteIndex;
    }
  }
  
  // Distribuir unidades pelos lotes, começando do lote disponível se especificado
  for (let i = startIndex; i < sortedPrices.length && remainingQuantity > 0; i++) {
    const price = sortedPrices[i];
    const quantidadeCompra = Number(price.quantidadeCompra) || 0;
    const lotUnitsPurchased = purchasesByLotMap.get(price.id) || 0;

    let unitsForThisLot = 0;

    if (quantidadeCompra === 0) {
      // quantidade_compra = 0: permite 1 unidade por agência por lote (segundo item usa segundo lote, etc.)
      if (lotUnitsPurchased === 0 && remainingQuantity > 0) {
        unitsForThisLot = 1;
      }
    } else {
      // quantidade_compra > 0: permite até quantidade_compra unidades neste lote
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
  variantId?: number; // ID da variação (modelo + tamanho)
  variantInfo?: {
    model: 'MASCULINO' | 'FEMININO' | 'UNISEX';
    size: string;
  };
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
  loteDisponivelId?: number; // ID do lote disponível calculado pelo backend
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: number, variantId?: number) => void;
  updateQuantity: (id: number, quantity: number, variantId?: number) => void;
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
      // Itens do mesmo produto (mesmo id) já no carrinho — qualquer modelo/tamanho conta para o limite
      const otherLinesSameProduct = prevItems.filter(
        (i) => i.id === item.id && (item.variantId != null ? i.variantId !== item.variantId : i.variantId != null)
      );
      const totalOtherInCart = otherLinesSameProduct.reduce((s, i) => s + i.quantity, 0);
      const otherLotUnits = new Map<number, number>();
      otherLinesSameProduct.forEach((i) => {
        i.lotDistribution?.forEach((lot) => {
          otherLotUnits.set(lot.priceId, (otherLotUnits.get(lot.priceId) || 0) + lot.quantity);
        });
      });
      // Base em item.prices para ter todos os lotes; senão só lotes da API entram e o novo item (outra variante) pega o 1º lote de novo
      const mergedPurchasesByLot = (item.prices || []).length
        ? (item.prices || []).map((p) => ({
            priceId: p.id,
            batch: p.batch,
            units:
              (item.purchasesByLot?.find((l) => l.priceId === p.id)?.units ?? 0) +
              (otherLotUnits.get(p.id) || 0),
          }))
        : (item.purchasesByLot || []).map((p) => ({
            ...p,
            units: p.units + (otherLotUnits.get(p.priceId) || 0),
          }));
      const effectiveAgencyCount = (item.agencyPurchaseCount || 0) + totalOtherInCart;

      // Se tem variantId, buscar item com mesmo id E variantId
      const existingItem = item.variantId
        ? prevItems.find((i) => i.id === item.id && i.variantId === item.variantId)
        : prevItems.find((i) => i.id === item.id && !i.variantId);

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;

        if (item.prices && item.prices.length > 0) {
          const { distribution, totalPrice, canAdd } = calculateLotDistribution(
            newQuantity,
            item.prices,
            effectiveAgencyCount,
            mergedPurchasesByLot,
            item.loteDisponivelId
          );

          if (!canAdd) {
            return prevItems;
          }

          const isSameLine = (i: CartItem) =>
            i.id === item.id && (item.variantId != null ? i.variantId === item.variantId : i.variantId == null);
          return prevItems.map((i) =>
            isSameLine(i)
              ? {
                  ...i,
                  quantity: newQuantity,
                  lotDistribution: distribution,
                  price: totalPrice / newQuantity,
                  prices: item.prices,
                  agencyPurchaseCount: item.agencyPurchaseCount,
                  purchasesByLot: item.purchasesByLot,
                  loteDisponivelId: item.loteDisponivelId,
                }
              : i
          );
        }

        const isSameLine = (i: CartItem) =>
          i.id === item.id && (item.variantId != null ? i.variantId === item.variantId : i.variantId == null);
        return prevItems.map((i) => (isSameLine(i) ? { ...i, quantity: newQuantity } : i));
      }

      // Novo item — considerar mesmo produto (outras variantes) já no carrinho para o limite
      let newItem: CartItem = { ...item, quantity: 1 };

      if (item.prices && item.prices.length > 0) {
        const { distribution, totalPrice, canAdd } = calculateLotDistribution(
          1,
          item.prices,
          effectiveAgencyCount,
          mergedPurchasesByLot,
          item.loteDisponivelId
        );

        if (!canAdd) {
          return prevItems;
        }

        newItem = {
          ...item,
          quantity: 1,
          lotDistribution: distribution,
          price: totalPrice,
        };
      }

      return [...prevItems, newItem];
    });
  };

  const removeItem = (id: number, variantId?: number) => {
    setItems((prevItems) =>
      prevItems.filter((item) => {
        if (item.id !== id) return true;
        if (variantId !== undefined) return item.variantId !== variantId;
        return item.variantId === undefined;
      })
    );
  };

  const updateQuantity = (id: number, quantity: number, variantId?: number) => {
    if (quantity <= 0) {
      removeItem(id, variantId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        const isTarget =
          item.id === id && (variantId === undefined ? item.variantId === undefined : item.variantId === variantId);
        if (!isTarget) return item;

        if (item.prices && item.prices.length > 0) {
          const otherLinesSameProduct = prevItems.filter(
            (i) => i.id === id && (variantId !== undefined ? i.variantId !== variantId : i.variantId != null)
          );
          const totalOtherInCart = otherLinesSameProduct.reduce((s, i) => s + i.quantity, 0);
          const otherLotUnits = new Map<number, number>();
          otherLinesSameProduct.forEach((i) => {
            i.lotDistribution?.forEach((lot) => {
              otherLotUnits.set(lot.priceId, (otherLotUnits.get(lot.priceId) || 0) + lot.quantity);
            });
          });
          const mergedPurchasesByLot =
            (item.prices || []).length > 0
              ? (item.prices || []).map((p) => ({
                  priceId: p.id,
                  batch: p.batch,
                  units:
                    (item.purchasesByLot?.find((l) => l.priceId === p.id)?.units ?? 0) +
                    (otherLotUnits.get(p.id) || 0),
                }))
              : (item.purchasesByLot || []).map((p) => ({
                  ...p,
                  units: p.units + (otherLotUnits.get(p.priceId) || 0),
                }));
          const effectiveAgencyCount = (item.agencyPurchaseCount || 0) + totalOtherInCart;

          const { distribution, totalPrice, canAdd } = calculateLotDistribution(
            quantity,
            item.prices,
            effectiveAgencyCount,
            mergedPurchasesByLot,
            item.loteDisponivelId
          );

          if (!canAdd) {
            return item;
          }

          return {
            ...item,
            quantity,
            lotDistribution: distribution,
            price: totalPrice / quantity,
          };
        }

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
