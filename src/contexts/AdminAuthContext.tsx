import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
  token: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Helper para obter a URL da API
const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return "http://localhost:5001/api";
    }
    // Em produção, usar URL relativa com /api
    return "/api";
  }
  // Fallback: usar /api
  return "/api";
};

// URL da API
const API_URL = getApiUrl();

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados do localStorage ao inicializar
  useEffect(() => {
    const storedAdmin = localStorage.getItem("admin");
    const storedToken = localStorage.getItem("adminToken");
    
    if (storedAdmin && storedToken) {
      try {
        const adminData = JSON.parse(storedAdmin);
        // Verificar se o token ainda é válido fazendo uma requisição
        verifyToken(storedToken).then((isValid) => {
          if (isValid) {
            setAdmin({ ...adminData, token: storedToken });
          } else {
            localStorage.removeItem("admin");
            localStorage.removeItem("adminToken");
          }
          setIsLoading(false);
        });
      } catch (error) {
        localStorage.removeItem("admin");
        localStorage.removeItem("adminToken");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      // Verificar se o usuário ainda é admin
      return data.role === "admin";
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erro no login:", data.message || "Erro desconhecido");
        setIsLoading(false);
        return false;
      }

      // Verificar se o usuário é admin
      if (data.role !== "admin") {
        console.error("Usuário não é admin:", data.role);
        setIsLoading(false);
        return false;
      }

      // Verificar se o token foi retornado
      if (!data.token) {
        console.error("Token não retornado na resposta");
        setIsLoading(false);
        return false;
      }

      const adminData: Admin = {
        id: data._id || data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        token: data.token,
      };

      setAdmin(adminData);
      localStorage.setItem("admin", JSON.stringify(adminData));
      localStorage.setItem("adminToken", data.token);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem("admin");
    localStorage.removeItem("adminToken");
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        login,
        logout,
        isAuthenticated: !!admin,
        isLoading,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth deve ser usado dentro de um AdminAuthProvider");
  }
  return context;
};
