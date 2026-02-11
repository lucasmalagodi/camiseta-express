import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Home, Package, FileSpreadsheet, Building2, Settings, ShoppingCart, Star, MessageSquare, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";

const AdminLayout = () => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Ativar notificações de novos pedidos
  useOrderNotifications();

  const handleLogout = () => {
    logout();
    toast.success("Logout realizado com sucesso!");
    navigate("/admin/login");
  };

  const menuItems = [
    { path: "/admin", label: "Home", icon: Home },
    { path: "/admin/produtos", label: "Produtos", icon: Package },
    { path: "/admin/destaques", label: "Produtos em Destaque", icon: Star },
    { path: "/admin/imports", label: "Imports de Pontos", icon: FileSpreadsheet },
    { path: "/admin/agencies", label: "Agências", icon: Building2 },
    { path: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
    { path: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
    { path: "/admin/tickets", label: "Tickets de Suporte", icon: MessageSquare },
    { path: "/admin/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-background/95 backdrop-blur-sm flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">
                {admin?.name || "Administrador"}
              </p>
            </div>
          </div>
        </div>

        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== "/admin" && location.pathname.startsWith(item.path));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">{admin?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="px-6 py-4">
            <h2 className="text-2xl font-bold">
              {menuItems.find((item) => item.path === location.pathname)?.label || "Dashboard"}
            </h2>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
