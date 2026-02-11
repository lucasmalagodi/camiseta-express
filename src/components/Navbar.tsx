import { useState } from "react";
import { ShoppingBag, LogIn, Menu, X, LogOut, User, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import CartSheet from "@/components/CartSheet";
import { NavLink } from "./NavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.svg";
import { formatPoints } from "@/lib/utils";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const navigate = useNavigate();
  const { agency, logout, isAuthenticated, refreshPoints, isRefreshingPoints, canRefreshPoints } = useAuth();
  const { totalItems } = useCart();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { name: "HOME", href: "/" },
    { name: "COLEÇÃO", href: "/collection" },
  ];

  return (
    <nav className="sticky top-0 left-0 right-0 z-[100] px-6 py-4 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center cursor-pointer"
        >
          <img src={logo} alt="Logo" className="h-20" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.href}
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors duration-300"
              activeClassName="text-foreground font-semibold"
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border">
            {isAuthenticated && agency ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex flex-col items-start px-3 py-2 rounded-lg hover:bg-black/20 dark:hover:bg-white/10 transition-colors min-w-[180px]"
                      aria-label="Perfil da Agência"
                    >
                      <span className="text-sm font-semibold text-foreground truncate max-w-[160px]">
                        {agency.name}
                      </span>
                      <span className="text-base font-bold text-primary">
                        {formatPoints(agency.points).toLocaleString("pt-BR")} pontos
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 z-[110]">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{agency.name}</span>
                        <span className="text-base font-bold text-primary">
                          {formatPoints(agency.points).toLocaleString("pt-BR")} pontos
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/tickets")}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Meus Tickets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/contato")}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contato
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Botão clicado!");
                    console.log("canRefreshPoints:", canRefreshPoints);
                    console.log("isRefreshingPoints:", isRefreshingPoints);
                    console.log("Chamando refreshPoints...");
                    refreshPoints();
                  }}
                  disabled={!canRefreshPoints}
                  className="h-8 w-8"
                  aria-label="Atualizar pontos"
                  title={!canRefreshPoints ? "Aguarde 5 minutos para atualizar novamente" : "Atualizar pontos"}
                >
                  <RefreshCw 
                    className={`w-4 h-4 ${isRefreshingPoints ? 'animate-spin' : ''} ${!canRefreshPoints ? 'opacity-50' : ''}`} 
                  />
                </Button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center justify-center p-1.5 rounded-full hover:bg-accent transition-colors"
                aria-label="Login"
              >
                <LogIn className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => {
                  if (isMobile) {
                    navigate("/cart");
                  } else {
                    setIsCartOpen(true);
                  }
                }}
                className="flex items-center justify-center p-1.5 rounded-full hover:bg-accent transition-colors"
                aria-label="Carrinho"
              >
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-[10px] text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Cart Button */}
            <div className="relative">
              <button
                onClick={() => navigate("/cart")}
                className="flex items-center justify-center p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Carrinho"
              >
                <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-card/95 backdrop-blur-lg border-b border-border p-6 animate-fade-in z-[105]">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-medium text-foreground hover:text-primary transition-colors text-left"
                activeClassName="text-primary font-semibold"
              >
                {link.name}
              </NavLink>
            ))}
            {isAuthenticated && agency ? (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {agency.name}
                    </span>
                    <span className="text-base font-bold text-primary">
                      {formatPoints(agency.points).toLocaleString("pt-BR")} pontos
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Botão mobile clicado!");
                      console.log("canRefreshPoints:", canRefreshPoints);
                      console.log("isRefreshingPoints:", isRefreshingPoints);
                      console.log("Chamando refreshPoints...");
                      refreshPoints();
                    }}
                    disabled={!canRefreshPoints}
                    className="h-8 w-8"
                    aria-label="Atualizar pontos"
                    title={!canRefreshPoints ? "Aguarde 5 minutos para atualizar novamente" : "Atualizar pontos"}
                  >
                    <RefreshCw 
                      className={`w-4 h-4 ${isRefreshingPoints ? 'animate-spin' : ''} ${!canRefreshPoints ? 'opacity-50' : ''}`} 
                    />
                  </Button>
                </div>
                <button
                  onClick={() => {
                    navigate("/tickets");
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-lg font-medium text-foreground hover:text-primary transition-colors mb-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Meus Tickets
                </button>
                <button
                  onClick={() => {
                    navigate("/contato");
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-lg font-medium text-foreground hover:text-primary transition-colors mb-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Contato
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-lg font-medium text-foreground hover:text-primary transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  navigate("/login");
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 text-lg font-medium text-foreground hover:text-primary transition-colors mt-2"
              >
                <LogIn className="w-5 h-5" />
                Login
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cart Sheet for Desktop */}
      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </nav>
  );
};

export default Navbar;
