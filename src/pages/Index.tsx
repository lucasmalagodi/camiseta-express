import HeroSection from "@/components/HeroSection";
import ProductsSection from "@/components/ProductsSection";
import logo from "@/assets/logo.svg";

const Index = () => {
  return (
    <>
      <HeroSection />
      <ProductsSection />
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
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

export default Index;
