import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProductCard from "./ProductCard";

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

const ProductsSection = () => {
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { productService } = await import("../services/api");
        const productsData = await productService.getAllForFrontend({ active: true }, agency?.id);
        // Limitar a 6 produtos para a seção inicial
        setProducts(productsData.slice(0, 6));
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [agency?.id]);
  return (
    <section id="produtos" className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="font-display text-5xl md:text-6xl text-foreground">
            NOSSOS <span className="text-gradient">MODELOS</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore nossa coleção exclusiva de camisetas premium. Qualidade superior e estilo incomparável.
          </p>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando produtos...</p>
          </div>
        ) : (
          <>
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
                  delay={index * 0.1}
                  quantity={product.quantity}
                  podeComprar={product.podeComprar}
                />
              ))}
            </div>

            {/* Load More Button */}
            <div className="text-center mt-12">
              <button
                onClick={() => navigate("/collection")}
                className="px-8 py-3 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                Ver Mais Produtos
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ProductsSection;
