import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, XCircle, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { productPriceService, orderService } from "@/services/api";
import { toast } from "sonner";
import { formatPoints } from "@/lib/utils";

// Import images
import tshirtWhite from "@/assets/tshirt-white.png";
import tshirtBlue from "@/assets/tshirt-blue.png";
import tshirtGray from "@/assets/tshirt-gray.png";
import tshirtRed from "@/assets/tshirt-red.png";
import tshirtGreen from "@/assets/tshirt-green.png";
import tshirtHero from "@/assets/tshirt-hero.png";
import acFrente from "@/assets/ac_frente.png";
import acCostas from "@/assets/ac_costas.png";
import cpFrente from "@/assets/cp_frente.png";
import cpCosta from "@/assets/cp_costa.png";
import emF from "@/assets/em_f.png";
import emCosta from "@/assets/em_costa.png";
import r11Frente from "@/assets/r11_frente.png";
import r11Costa from "@/assets/r11_costa.png";
import itaFrente from "@/assets/ita_frente.png";
import itaCosta from "@/assets/ita_costa.png";
import saaFrente from "@/assets/saa_frente.png";
import saaCostas from "@/assets/saa_costas.png";

const imageMap: Record<string, string> = {
  "/src/assets/tshirt-white.png": tshirtWhite,
  "/src/assets/tshirt-blue.png": tshirtBlue,
  "/src/assets/tshirt-gray.png": tshirtGray,
  "/src/assets/tshirt-red.png": tshirtRed,
  "/src/assets/tshirt-green.png": tshirtGreen,
  "/src/assets/tshirt-hero.png": tshirtHero,
  "/src/assets/ac_frente.png": acFrente,
  "/src/assets/ac_costas.png": acCostas,
  "/src/assets/cp_frente.png": cpFrente,
  "/src/assets/cp_costa.png": cpCosta,
  "/src/assets/em_f.png": emF,
  "/src/assets/em_costa.png": emCosta,
  "/src/assets/r11_frente.png": r11Frente,
  "/src/assets/r11_costa.png": r11Costa,
  "/src/assets/ita_frente.png": itaFrente,
  "/src/assets/ita_costa.png": itaCosta,
  "/src/assets/saa_frente.png": saaFrente,
  "/src/assets/saa_costas.png": saaCostas,
};

interface Product {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  modelo: string;
  valor: number;
  valorPrimeiroLote: number;
  imagens: string[];
  quantity?: number;
  agencyPurchaseCount?: number;
  podeComprar?: boolean;
  loteDisponivel?: { id: number; value: number; batch: number } | null;
  variants?: Array<{
    id: number;
    model: 'MASCULINO' | 'FEMININO' | 'UNISEX';
    size: string;
    stock: number;
    active: boolean;
  }>;
}

const Product = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { agency } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [purchaseInfo, setPurchaseInfo] = useState<{ totalUnits: number; purchasesByLot: Array<{ priceId: number; batch: number; units: number }> } | null>(null);
  const [productPrices, setProductPrices] = useState<Array<{ id: number; value: number; batch: number; quantidadeCompra: number }>>([]);
  const [selectedModel, setSelectedModel] = useState<'MASCULINO' | 'FEMININO' | 'UNISEX' | ''>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const loadingRef = useRef(false);
  const lastRequestRef = useRef<{ id: number; agencyId?: number } | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!id) return;
        
        const productId = Number(id);
        const agencyId = agency?.id;
        
        // Evitar requisições duplicadas
        if (loadingRef.current) return;
        
        // Se já fizemos uma requisição com os mesmos parâmetros, não fazer novamente
        if (lastRequestRef.current && 
            lastRequestRef.current.id === productId && 
            lastRequestRef.current.agencyId === agencyId) {
          return;
        }
        
        loadingRef.current = true;
        lastRequestRef.current = { id: productId, agencyId };
        setLoading(true);
        
        // Buscar produto da API (passando agencyId se logado para incluir contagem de compras)
        const { productService } = await import("../services/api");
        const foundProduct = await productService.getProductForFrontend(productId, agencyId);
        
        if (foundProduct) {
          setProduct(foundProduct);
          
          // Buscar preços do produto
          const prices = await productPriceService.getAll(productId);
          const activePrices = prices
            .filter((p: any) => p.active)
            .map((p: any) => ({
              id: p.id,
              value: Number(p.value),
              batch: Number(p.batch),
              quantidadeCompra: Number(p.quantidadeCompra) || 0
            }))
            .sort((a, b) => a.batch - b.batch);
          setProductPrices(activePrices);
          
          // Buscar informações de compras se agência estiver logada
          if (agencyId) {
            try {
              const purchaseInfo = await orderService.getProductPurchaseCount(agencyId, productId);
              setPurchaseInfo(purchaseInfo);
            } catch (error) {
              console.error("Erro ao buscar informações de compras:", error);
              setPurchaseInfo({ totalUnits: 0, purchasesByLot: [] });
            }
          } else {
            setPurchaseInfo({ totalUnits: 0, purchasesByLot: [] });
          }
          
          // Carregar produtos relacionados (passando agencyId se logado)
          const allProducts = await productService.getAllForFrontend({ active: true }, agencyId);
          const related = allProducts.filter(
            (p: Product) => p.id !== foundProduct.id
          ).slice(0, 4); // Limitar a 4 produtos relacionados
          setRelatedProducts(related);
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
        navigate("/");
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id, navigate, agency?.id]);

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);
    return () => api.off("select", handleSelect);
  }, [api]);

  const handleAddToCart = () => {
    if (!product) return;

    // Se tem variações, validar seleção
    if (product.variants && product.variants.length > 0) {
      if (!selectedModel || !selectedSize || !selectedVariantId) {
        toast.error("Selecione o modelo e tamanho antes de adicionar ao carrinho");
        return;
      }

      const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
      if (!selectedVariant || selectedVariant.stock === 0) {
        toast.error("Esta variação está fora de estoque");
        return;
      }
    }

    const baseItem = {
      id: product.id,
      name: product.nome,
      image: product.imagens[0]?.startsWith('http') 
        ? product.imagens[0] 
        : (imageMap[product.imagens[0]] || product.imagens[0]),
      price: product.loteDisponivel 
        ? Number(product.loteDisponivel.value) 
        : Number(product.valorPrimeiroLote || 0),
      originalPrice: Number(product.valor || 0),
      variantId: selectedVariantId || undefined,
      variantInfo: selectedModel && selectedSize ? {
        model: selectedModel as 'MASCULINO' | 'FEMININO' | 'UNISEX',
        size: selectedSize
      } : undefined,
    };

    // Se tem preços (lotes), passar informações completas
    if (productPrices.length > 0) {
      addItem({
        ...baseItem,
        prices: productPrices,
        agencyPurchaseCount: purchaseInfo?.totalUnits || 0,
        purchasesByLot: purchaseInfo?.purchasesByLot || [],
        loteDisponivelId: product.loteDisponivel?.id
      });
    } else {
      addItem(baseItem);
    }
    
    const variantText = selectedModel && selectedSize 
      ? ` (${getModelName(selectedModel)} - ${selectedSize})` 
      : '';
    toast.success(`${product.nome}${variantText} adicionado ao carrinho!`);
  };

  // Obter modelos disponíveis únicos
  const availableModels = product?.variants
    ? Array.from(new Set(product.variants.map(v => v.model).filter(Boolean)))
    : [];

  // Função para obter o nome amigável do modelo
  const getModelName = (model: string) => {
    switch (model) {
      case 'MASCULINO':
        return 'Masculino';
      case 'FEMININO':
        return 'Feminino';
      case 'UNISEX':
        return 'Unisex';
      default:
        return model;
    }
  };

  // Filtrar tamanhos disponíveis baseado no modelo selecionado
  const availableSizes = selectedModel && product?.variants
    ? product.variants
        .filter(v => v.model === selectedModel && v.active)
        .map(v => ({ size: v.size, stock: v.stock, id: v.id }))
        .sort((a, b) => {
          // Ordenar tamanhos: P, M, G, GG, etc.
          const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
          const aIndex = sizeOrder.indexOf(a.size.toUpperCase());
          const bIndex = sizeOrder.indexOf(b.size.toUpperCase());
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.size.localeCompare(b.size);
        })
    : [];

  // Resetar tamanho quando modelo mudar
  useEffect(() => {
    if (selectedModel) {
      setSelectedSize('');
      setSelectedVariantId(null);
    }
  }, [selectedModel]);

  // Atualizar variantId quando tamanho mudar
  useEffect(() => {
    if (selectedModel && selectedSize && product?.variants) {
      const variant = product.variants.find(
        v => v.model === selectedModel && v.size === selectedSize && v.active
      );
      setSelectedVariantId(variant?.id || null);
    }
  }, [selectedModel, selectedSize, product]);

  if (loading) {
    return (
      <div className="pt-24 pb-12 px-4 sm:px-6 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              <Carousel className="w-full" setApi={setApi}>
                <CarouselContent>
                  {product.imagens.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-gradient-to-b from-slate-50 to-slate-100">
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
                        <img
                          src={
                            image?.startsWith('http') 
                              ? image 
                              : (imageMap[image] || image)
                          }
                          alt={`${product.nome} - Imagem ${index + 1}`}
                          className="relative w-full h-full object-contain"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {product.imagens.length > 1 && (
                  <>
                    <CarouselPrevious 
                      variant="default"
                      className="left-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg" 
                    />
                    <CarouselNext 
                      variant="default"
                      className="right-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg" 
                    />
                  </>
                )}
              </Carousel>

              {/* Thumbnail Gallery */}
              {product.imagens.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {product.imagens.map((image, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        api?.scrollTo(index);
                        setSelectedIndex(index);
                      }}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 cursor-pointer transition-colors bg-gradient-to-b from-slate-50 to-slate-100 ${
                        selectedIndex === index
                          ? "border-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
                      <img
                        src={imageMap[image] || image}
                        alt={`${product.nome} - Thumbnail ${index + 1}`}
                        className="relative w-full h-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Code */}
              <div>
                <span className="text-sm text-muted-foreground">Código: </span>
                <span className="text-sm font-medium text-foreground">
                  {product.codigo}
                </span>
              </div>

              {/* Name */}
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {product.nome}
              </h1>

              {/* Model */}
              <div>
                <span className="text-sm text-muted-foreground">Modelo: </span>
                <span className="text-sm font-medium text-foreground">
                  {product.modelo}
                </span>
              </div>

              {/* Prices */}
              <div className="space-y-2">
                {(() => {
                  // Se limite atingido, usar último lote cadastrado
                  const ultimoLote = productPrices.length > 0 
                    ? productPrices[productPrices.length - 1] 
                    : null;
                  const loteParaExibicao = product.loteDisponivel 
                    ? product.loteDisponivel
                    : (product.podeComprar === false && ultimoLote
                      ? { id: ultimoLote.id, value: ultimoLote.value, batch: ultimoLote.batch }
                      : null);
                  
                  const valorExibido = loteParaExibicao
                    ? Number(loteParaExibicao.value || 0)
                    : Number(product.valorPrimeiroLote || 0);
                  
                  const numeroLote = loteParaExibicao
                    ? loteParaExibicao.batch
                    : (ultimoLote ? ultimoLote.batch : 1);
                  
                  return (
                    <>
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl md:text-5xl font-bold text-primary">
                          {formatPoints(valorExibido)} pts
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({numeroLote}º Lote)
                        </span>
                      </div>
                      {product.valor > valorExibido && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl text-muted-foreground line-through">
                            {formatPoints(Number(product.valor || 0))} pts
                          </span>
                          <span className="text-sm text-muted-foreground">
                            (Preço Original)
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Descrição
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {product.descricao}
                </p>
              </div>

              {/* Stock Status */}
              {product.quantity !== undefined && product.quantity < 3 && (
                <div className="flex items-center gap-2">
                  {product.quantity > 0 ? (
                    <Badge variant="default" className={product.quantity==1?"bg-red-500":"bg-yellow-500"}>
                      Em estoque ({product.quantity} disponível{product.quantity !== 1 ? 'eis' : 'l'})
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Esgotado
                    </Badge>
                  )}
                </div>
              )}

              {/* Purchase Info */}
              {agency && purchaseInfo && purchaseInfo.totalUnits > 0 && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <h3 className="text-sm font-semibold text-foreground">
                    Suas Compras
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Você já comprou <span className="font-semibold text-foreground">{purchaseInfo.totalUnits}</span> unidade{purchaseInfo.totalUnits !== 1 ? 's' : ''} deste produto.
                  </p>
                  {purchaseInfo.purchasesByLot.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {purchaseInfo.purchasesByLot.map((lot, index) => (
                        <div key={index}>
                          Lote {lot.batch}: {lot.units} unidade{lot.units !== 1 ? 's' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Model and Size Selection */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground">
                    Selecione Modelo e Tamanho
                  </h3>
                  
                  {/* Model Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="product-model">Modelo *</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableModels.map((model) => {
                        const hasStock = product.variants?.some(
                          v => v.model === model && v.active && v.stock > 0
                        );
                        return (
                          <button
                            key={model}
                            type="button"
                            onClick={() => {
                              if (hasStock) {
                                setSelectedModel(model as 'MASCULINO' | 'FEMININO' | 'UNISEX');
                                // Resetar tamanho quando mudar modelo
                                setSelectedSize('');
                                setSelectedVariantId(null);
                              }
                            }}
                            disabled={!hasStock}
                            className={`
                              px-6 py-3 rounded-lg border-2 transition-all font-medium
                              ${selectedModel === model
                                ? 'border-primary bg-primary text-primary-foreground'
                                : !hasStock
                                ? 'border-muted bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                                : 'border-border hover:border-primary cursor-pointer bg-background'
                              }
                            `}
                          >
                            {getModelName(model)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Size Selection */}
                  {selectedModel && availableSizes.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="product-size">Tamanho *</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {availableSizes.map(({ size, stock, id }) => {
                          const isOutOfStock = stock === 0;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                if (!isOutOfStock) {
                                  setSelectedSize(size);
                                  setSelectedVariantId(id);
                                }
                              }}
                              disabled={isOutOfStock}
                              className={`
                                px-4 py-2 rounded-lg border-2 transition-all
                                ${selectedSize === size
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : isOutOfStock
                                  ? 'border-muted bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                                  : 'border-border hover:border-primary cursor-pointer'
                                }
                              `}
                            >
                              <div className="text-center">
                                <div className={`font-medium ${isOutOfStock ? 'line-through' : ''}`}>
                                  {size}
                                </div>
                                {isOutOfStock && (
                                  <div className="text-xs mt-1">Esgotado</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Size Chart Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSizeChartOpen(true)}
                      className="w-full"
                    >
                      <Ruler className="w-4 h-4 mr-2" />
                      Tabela de Tamanhos
                    </Button>
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                className="w-full"
                size="lg"
                disabled={
                  (product.quantity !== undefined && product.quantity === 0) ||
                  (product.podeComprar !== undefined && !product.podeComprar) ||
                  (product.variants && product.variants.length > 0 && (!selectedModel || !selectedSize || !selectedVariantId))
                }
              >
                {product.quantity !== undefined && product.quantity === 0 ? (
                  <>
                    <XCircle className="w-5 h-5 mr-2" />
                    Produto Esgotado
                  </>
                ) : product.podeComprar !== undefined && !product.podeComprar ? (
                  <>
                    <XCircle className="w-5 h-5 mr-2" />
                    Limite de Compra Atingido
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Adicionar ao Carrinho
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Related Products Carousel */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 lg:col-span-2">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
                Outros Produtos
              </h2>
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {relatedProducts.map((relatedProduct) => (
                    <CarouselItem
                      key={relatedProduct.id}
                      className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
                    >
                      <div
                        onClick={() => navigate(`/product/${relatedProduct.id}`)}
                        className="group relative rounded-2xl bg-card border border-border overflow-hidden card-shadow cursor-pointer h-full"
                      >
                        {/* Image Container */}
                        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
                          <img
                            src={
                              relatedProduct.imagens[0]?.startsWith('http') 
                                ? relatedProduct.imagens[0] 
                                : (imageMap[relatedProduct.imagens[0]] || relatedProduct.imagens[0])
                            }
                            alt={relatedProduct.nome}
                            className="relative w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                          />
                          {/* Discount Badge */}
                          {Number(relatedProduct.valor) > Number(relatedProduct.valorPrimeiroLote) && (
                            <div className="absolute top-4 left-4 px-3 py-1 rounded-full hero-gradient text-xs font-semibold text-primary-foreground">
                              -{Math.round(
                                ((Number(relatedProduct.valor) -
                                  Number(relatedProduct.valorPrimeiroLote)) /
                                  Number(relatedProduct.valor)) *
                                  100
                              )}
                              %
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-4 space-y-2">
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {relatedProduct.nome}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-primary">
                              {formatPoints(Number(relatedProduct.valorPrimeiroLote || 0))} pts
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPoints(Number(relatedProduct.valor || 0))} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious 
                  variant="default"
                  className="left-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg" 
                />
                <CarouselNext 
                  variant="default"
                  className="right-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg" 
                />
              </Carousel>
            </div>
          )}
        </div>

        {/* Size Chart Modal */}
        <Dialog open={isSizeChartOpen} onOpenChange={setIsSizeChartOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tabela de Tamanhos</DialogTitle>
              <DialogDescription>
                Consulte as medidas para escolher o tamanho ideal
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Tabela de medidas */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Peito (cm)</TableHead>
                      <TableHead>Cintura (cm)</TableHead>
                      <TableHead>Comprimento (cm)</TableHead>
                      <TableHead>Ombro (cm)</TableHead>
                      <TableHead>Manga (cm)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Exemplo de dados - será substituído por dados reais da API */}
                    {[
                      { size: 'P', chest: 48, waist: 44, length: 68, shoulder: 42, sleeve: 20 },
                      { size: 'M', chest: 52, waist: 48, length: 70, shoulder: 44, sleeve: 21 },
                      { size: 'G', chest: 56, waist: 52, length: 72, shoulder: 46, sleeve: 22 },
                      { size: 'GG', chest: 60, waist: 56, length: 74, shoulder: 48, sleeve: 23 },
                      { size: 'XG', chest: 64, waist: 60, length: 76, shoulder: 50, sleeve: 24 },
                    ].map((row) => (
                      <TableRow key={row.size}>
                        <TableCell className="font-medium">{row.size}</TableCell>
                        <TableCell>{row.chest}</TableCell>
                        <TableCell>{row.waist}</TableCell>
                        <TableCell>{row.length}</TableCell>
                        <TableCell>{row.shoulder}</TableCell>
                        <TableCell>{row.sleeve}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Instruções de como medir */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Como medir:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li><strong>Peito:</strong> Meça ao redor da parte mais larga do peito, mantendo a fita métrica horizontal</li>
                  <li><strong>Cintura:</strong> Meça ao redor da cintura natural, onde você normalmente usa o cinto</li>
                  <li><strong>Comprimento:</strong> Meça do ombro até a parte inferior da camiseta</li>
                  <li><strong>Ombro:</strong> Meça de um ombro ao outro, na parte de trás</li>
                  <li><strong>Manga:</strong> Meça do ombro até o punho</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default Product;
