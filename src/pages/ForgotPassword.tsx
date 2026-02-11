import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.svg";

const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return "http://localhost:5001/api";
    }
    return "/api";
  }
  return "/api";
};
const API_URL = getApiUrl();

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao processar solicitação");
      }

      setIsSuccess(true);
      toast.success("Email enviado com sucesso!", {
        description: "Verifique sua caixa de entrada e siga as instruções.",
      });
    } catch (error: any) {
      toast.error("Erro ao enviar email", {
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
            <div className="flex items-center justify-center mb-4">
              <img src={logo} alt="Logo" className="h-16" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-8 text-center space-y-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Email enviado!</h2>
            <p className="text-muted-foreground">
              Se o email estiver cadastrado, você receberá um link de recuperação de senha.
            </p>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada e siga as instruções. O link expira em 1 hora.
            </p>
            <div className="pt-4">
              <Button onClick={() => navigate("/login")} className="w-full">
                Voltar ao login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center justify-center mb-4">
            <img src={logo} alt="Logo" className="h-16" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Recuperar Senha</h1>
          <p className="text-muted-foreground mt-2">
            Digite seu email para receber um link de recuperação
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>

          <div className="text-center text-sm">
            <Link
              to="/login"
              className="text-primary hover:underline"
            >
              Lembrou sua senha? Fazer login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
