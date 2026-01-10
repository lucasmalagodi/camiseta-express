import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductsSection from "@/components/ProductsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ProductsSection />
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 hero-gradient rounded-lg flex items-center justify-center">
              <span className="font-display text-xl text-primary-foreground">TS</span>
            </div>
            <span className="font-display text-2xl tracking-wider text-foreground">TSHIRTS</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 TShirts. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
