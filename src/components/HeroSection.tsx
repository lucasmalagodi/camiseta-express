import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { heroProductService } from "@/services/api";
import { formatPoints } from "@/lib/utils";
import alaDlFrente from "@/assets/ala_dl_frente.png";
import cpFrente from "@/assets/cp_frente.png";
import emF from "@/assets/em_f.png";
import r11Frente from "@/assets/r11_frente.png";

interface HeroProduct {
  id: number;
  nome: string;
  descricao: string;
  imagem: string;
  imagem_mobile?: string;
  preco: number;
  displayDuration?: number;
  link?: {
    type: 'PRODUCT' | 'EXTERNAL';
    product_id?: number;
    url?: string;
  };
}

const imageMap: Record<string, string> = {
  "/src/assets/ala_dl_frente.png": alaDlFrente,
  "/src/assets/cp_frente.png": cpFrente,
  "/src/assets/em_f.png": emF,
  "/src/assets/r11_frente.png": r11Frente,
};

// Helper para construir URL completa da imagem
const getImageUrl = (imagePath: string): string => {
  // Se já é uma URL completa, retornar como está
  if (imagePath?.startsWith('http')) {
    return imagePath;
  }
  
  // Se está no imageMap (imagens locais antigas), usar o import
  if (imageMap[imagePath]) {
    return imageMap[imagePath];
  }
  
  // Se começa com /assets ou /src/assets, construir URL completa
  if (imagePath?.startsWith('/assets') || imagePath?.startsWith('/src/assets')) {
    const API_BASE = typeof window !== 'undefined' && window.location 
      ? window.location.origin 
      : '';
    return `${API_BASE}${imagePath}`;
  }
  
  // Fallback: retornar o path original
  return imagePath || '';
};

const HeroSection = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { agency } = useAuth();
  const [products, setProducts] = useState<HeroProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        // Buscar produtos em destaque da API (passando agencyId se logado)
        const productsData = await heroProductService.getActiveForDisplay(agency?.id);
        setProducts(productsData);
      } catch (error) {
        console.error("Erro ao carregar produtos do banner:", error);
        // Em caso de erro, manter array vazio
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [agency?.id]);

  // Auto-rotate products com tempo configurável
  useEffect(() => {
    if (products.length === 0) return;
    
    const currentProduct = products[currentIndex] || products[0];
    const duration = (currentProduct?.displayDuration || 5) * 1000; // Converter segundos para milissegundos
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, duration);

    return () => clearInterval(interval);
  }, [products.length, currentIndex, products]);

  const currentProduct = products[currentIndex] || products[0];

  const handleAddToCart = () => {
    if (!currentProduct) return;

    // Só adicionar ao carrinho se for um produto (não banner externo)
    if (currentProduct.link?.type === 'EXTERNAL') {
      // Redirecionar para URL externa
      if (currentProduct.link.url) {
        window.open(currentProduct.link.url, '_blank');
      }
      return;
    }

    addItem({
      id: currentProduct.id,
      name: currentProduct.nome,
      image: getImageUrl(currentProduct.imagem),
      price: currentProduct.preco,
    });
    
    toast.success(`${currentProduct.nome} adicionado ao carrinho!`);
  };

  // Obter imagem baseada no tamanho da tela
  const getCurrentImage = () => {
    if (!currentProduct) return '';
    const isMobile = window.innerWidth < 768;
    const imagePath = isMobile && currentProduct.imagem_mobile 
      ? currentProduct.imagem_mobile 
      : currentProduct.imagem;
    return getImageUrl(imagePath);
  };

  // Se não há produtos e não está carregando, não mostrar nada
  if (!loading && products.length === 0) {
    return null;
  }

  // Verificar se o banner atual é externo
  const isExternalBanner = currentProduct?.link?.type === 'EXTERNAL';

  // Renderização para banner externo (full-width)
  if (isExternalBanner && currentProduct) {
    return (
      <section className="relative w-full overflow-hidden">
        <div 
          className="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] cursor-pointer group z-0"
          onClick={handleAddToCart}
        >
          <img
            src={getCurrentImage()}
            alt={currentProduct.nome || 'Banner'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay escuro para melhorar legibilidade do texto (opcional) */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          
          {/* Navigation Dots para banners externos */}
          {products.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
              {products.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`transition-all ${
                    index === currentIndex
                      ? "w-3 h-3 rounded-full border-2 border-white bg-white"
                      : "w-2 h-2 rounded-full bg-white/50 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Renderização para produto (layout original)
  return (
    <section className="relative min-h-screen diagonal-bg overflow-hidden">
      <div className="relative z-0 max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="font-display text-7xl md:text-8xl lg:text-9xl text-foreground leading-none animate-fade-in">
                CAMI
              </h1>
              <h1 
                className="font-display text-7xl md:text-8xl lg:text-9xl text-gradient leading-none animate-fade-in"
                style={{ animationDelay: "0.1s" }}
              >
                SETAS
              </h1>
            </div>

            {currentProduct && (
              <p 
                className="text-lg text-muted-foreground max-w-md animate-fade-in"
                style={{ animationDelay: "0.2s" }}
              >
                {currentProduct.descricao}
              </p>
            )}

            {/* Price */}
            {currentProduct && (
              <div 
                className="flex flex-col animate-fade-in"
                style={{ animationDelay: "0.25s" }}
              >
                <span className="text-sm text-muted-foreground">pontos</span>
                <span className="text-4xl md:text-5xl font-bold text-primary">
                  {formatPoints(currentProduct.preco)}
                </span>
              </div>
            )}

            {currentProduct && (
              <div 
                className="flex flex-wrap gap-4 animate-fade-in"
                style={{ animationDelay: "0.3s" }}
              >
                {(currentProduct.link?.type === 'PRODUCT' || !currentProduct.link) && (
                  <Button 
                    variant="hero" 
                    size="lg"
                    onClick={handleAddToCart}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="group"
                  onClick={() => navigate("/collection")}
                >
                  Ver Coleção
                  <span className="ml-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </Button>
              </div>
            )}
          </div>

          {/* Right Content - Product Image with Tags */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div 
              className="relative animate-float group"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
                const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
                setMousePosition({ x, y });
              }}
              onMouseLeave={() => setMousePosition({ x: 0, y: 0 })}
            >
              {currentProduct && (
                <img
                  src={getCurrentImage()}
                  alt={currentProduct.nome}
                  className="w-96 md:w-[500px] lg:w-[600px] xl:w-[700px] drop-shadow-2xl transition-transform duration-300 ease-out"
                  style={{
                    transform: `translate(${mousePosition.x}px, ${mousePosition.y}px) rotateX(${mousePosition.y * -0.1}deg) rotateY(${mousePosition.x * 0.1}deg) scale(1.05)`,
                  }}
                />
              )}

              {/* Navigation Dots */}
              {products.length > 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 hidden lg:flex flex-col gap-3">
                  {products.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`transition-all ${
                        index === currentIndex
                          ? "w-3 h-3 rounded-full border-2 border-foreground bg-primary"
                          : "w-2 h-2 rounded-full bg-muted-foreground/50 hover:bg-muted-foreground/70"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
