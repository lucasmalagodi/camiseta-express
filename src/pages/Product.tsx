import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

    // Se tem preços (lotes), passar informações completas
    if (productPrices.length > 0) {
      addItem({
        id: product.id,
        name: product.nome,
        image: product.imagens[0]?.startsWith('http') 
          ? product.imagens[0] 
          : (imageMap[product.imagens[0]] || product.imagens[0]),
        price: product.loteDisponivel 
          ? Number(product.loteDisponivel.value) 
          : Number(product.valorPrimeiroLote || 0),
        originalPrice: Number(product.valor || 0),
        prices: productPrices,
        agencyPurchaseCount: purchaseInfo?.totalUnits || 0,
        purchasesByLot: purchaseInfo?.purchasesByLot || []
      });
    } else {
      // Se não tem lotes, usar preço simples
      const priceToUse = product.loteDisponivel 
        ? Number(product.loteDisponivel.value) 
        : Number(product.valorPrimeiroLote || 0);

      addItem({
        id: product.id,
        name: product.nome,
        image: product.imagens[0]?.startsWith('http') 
          ? product.imagens[0] 
          : (imageMap[product.imagens[0]] || product.imagens[0]),
        price: priceToUse,
        originalPrice: Number(product.valor || 0),
      });
    }
    
    toast.success(`${product.nome} adicionado ao carrinho!`);
  };

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
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl md:text-5xl font-bold text-primary">
                    {formatPoints(product.loteDisponivel 
                      ? Number(product.loteDisponivel.value || 0)
                      : Number(product.valorPrimeiroLote || 0))} pts
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {product.loteDisponivel 
                      ? `(${product.loteDisponivel.batch}º Lote)`
                      : "(1º Lote)"}
                  </span>
                </div>
                {(() => {
                  const precoAtual = product.loteDisponivel 
                    ? Number(product.loteDisponivel.value || 0)
                    : Number(product.valorPrimeiroLote || 0);
                  return product.valor > precoAtual && (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-muted-foreground line-through">
                        {formatPoints(Number(product.valor || 0))} pts
                      </span>
                      <span className="text-sm text-muted-foreground">
                        (Preço Original)
                      </span>
                    </div>
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

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                className="w-full"
                size="lg"
                disabled={
                  (product.quantity !== undefined && product.quantity === 0) ||
                  (product.podeComprar !== undefined && !product.podeComprar)
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
      </div>
  );
};

export default Product;
