import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import tshirtHero from "@/assets/tshirt-hero.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen diagonal-bg overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
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

            <p 
              className="text-lg text-muted-foreground max-w-md animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Aqui você encontra camisetas de alta qualidade em uma ampla variedade.
              Aproveite 40% de desconto em todos os produtos.
            </p>

            <div 
              className="flex flex-wrap gap-4 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Button variant="hero" size="lg">
                Começar a Comprar
              </Button>
              <Button variant="outline" size="lg" className="group">
                Ver Categorias
                <span className="ml-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Button>
            </div>

            {/* Purchase Notification */}
            <div 
              className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 backdrop-blur-sm border border-border max-w-sm animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                <img src={tshirtHero} alt="Camiseta" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Camiseta Premium</span>
                  <span className="font-bold text-primary">R$149</span>
                </div>
                <span className="text-xs text-primary font-semibold">COMPRADO</span>
                <p className="text-xs text-muted-foreground mt-1">há 1 minuto • São Paulo, BR</p>
              </div>
            </div>
          </div>

          {/* Right Content - Product Image with Tags */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative animate-float">
              <img
                src={tshirtHero}
                alt="Camiseta em destaque"
                className="w-80 md:w-96 lg:w-[420px] drop-shadow-2xl"
              />

              {/* Product Tag 1 */}
              <div 
                className="product-tag top-4 -right-4 animate-slide-in-right"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="flex flex-col">
                  <span className="text-sm text-foreground">Camiseta Preta</span>
                  <span className="text-sm font-bold text-primary">R$110</span>
                </div>
                <button className="add-button ml-2">
                  <Plus className="w-4 h-4 text-foreground" />
                </button>
              </div>

              {/* Product Tag 2 */}
              <div 
                className="product-tag bottom-1/4 -right-8 animate-slide-in-right"
                style={{ animationDelay: "0.7s" }}
              >
                <div className="flex flex-col">
                  <span className="text-sm text-foreground">Algodão Premium</span>
                  <span className="text-sm font-bold text-primary">R$89</span>
                </div>
                <button className="add-button ml-2">
                  <Plus className="w-4 h-4 text-foreground" />
                </button>
              </div>

              {/* Navigation Dots */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 hidden lg:flex flex-col gap-3">
                <button className="w-3 h-3 rounded-full border-2 border-foreground bg-primary"></button>
                <button className="w-2 h-2 rounded-full bg-muted-foreground/50"></button>
                <button className="w-2 h-2 rounded-full bg-muted-foreground/50"></button>
                <button className="w-2 h-2 rounded-full bg-muted-foreground/50"></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
