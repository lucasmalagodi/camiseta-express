import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn, Shield } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { toast } from "sonner";
import logo from "@/assets/logo.svg";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiplos submits
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);

    try {
      const success = await login(loginData.email, loginData.password);

      if (success) {
        toast.success("Login realizado com sucesso!");
        // Pequeno delay para garantir que o estado foi atualizado
        setTimeout(() => {
          navigate("/admin");
        }, 100);
      } else {
        toast.error("Email ou senha incorretos, ou você não tem permissão de administrador!", {
          style: {
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fca5a5",
          },
        });
      }
    } catch (error) {
      console.error("Erro no handleLogin:", error);
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={logo} alt="Logo" className="h-16" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Acesso restrito para administradores
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@email.com"
              value={loginData.email}
              onChange={(e) =>
                setLoginData({ ...loginData, email: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({ ...loginData, password: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            <LogIn className="w-4 h-4 mr-2" />
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar para o site
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
