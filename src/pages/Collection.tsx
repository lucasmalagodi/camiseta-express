import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProductCard from "@/components/ProductCard";
import logo from "@/assets/logo.svg";

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
  podeComprar?: boolean;
}

// Import images
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

const Collection = () => {
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { productService } = await import("../services/api");
        const productsData = await productService.getAllForFrontend({ active: true }, agency?.id);
        setProducts(productsData);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [agency?.id]);

  if (loading) {
    return (
      <div className="pt-24 pb-12 px-4 sm:px-6 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 space-y-4">
            <h1 className="font-display text-5xl md:text-6xl text-foreground">
              NOSSA <span className="text-gradient">COLEÇÃO</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore nossa coleção completa de camisetas premium. Qualidade superior e estilo incomparável.
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                id={product.id}
                image={
                  product.imagens[0]?.startsWith('http') 
                    ? product.imagens[0] 
                    : (imageMap[product.imagens[0]] || product.imagens[0])
                }
                name={product.nome}
                price={product.valorPrimeiroLote}
                originalPrice={product.valor}
                delay={index * 0.05}
                quantity={product.quantity}
                podeComprar={product.podeComprar}
              />
            ))}
          </div>

          {/* Empty State */}
          {products.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                Nenhum produto encontrado.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={logo} alt="Logo" className="h-10" />
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 Travel Collection. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </>
  );
};

export default Collection;
