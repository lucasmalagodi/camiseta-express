import ProductCard from "./ProductCard";
import tshirtWhite from "@/assets/tshirt-white.png";
import tshirtBlue from "@/assets/tshirt-blue.png";
import tshirtGray from "@/assets/tshirt-gray.png";
import tshirtRed from "@/assets/tshirt-red.png";
import tshirtGreen from "@/assets/tshirt-green.png";
import tshirtHero from "@/assets/tshirt-hero.png";

const products = [
  {
    id: 1,
    image: tshirtWhite,
    name: "Camiseta Branca Classic",
    price: 89,
    originalPrice: 149,
  },
  {
    id: 2,
    image: tshirtBlue,
    name: "Camiseta Azul Navy",
    price: 99,
    originalPrice: 165,
  },
  {
    id: 3,
    image: tshirtGray,
    name: "Camiseta Cinza Mescla",
    price: 79,
    originalPrice: 129,
  },
  {
    id: 4,
    image: tshirtRed,
    name: "Camiseta Bordô Premium",
    price: 110,
    originalPrice: 189,
  },
  {
    id: 5,
    image: tshirtGreen,
    name: "Camiseta Verde Militar",
    price: 95,
    originalPrice: 159,
  },
  {
    id: 6,
    image: tshirtHero,
    name: "Camiseta Preta Essential",
    price: 85,
    originalPrice: 139,
  },
];

const ProductsSection = () => {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              image={product.image}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-12">
          <button className="px-8 py-3 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-300">
            Ver Mais Produtos
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
