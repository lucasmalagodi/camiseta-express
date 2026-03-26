import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { setOnAdminUnauthorized, setOnAdminActivity } from "@/services/api";

interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
  token: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Encerrar sessão após este tempo sem atividade (ex.: 24h = 1 dia)
const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const ADMIN_LAST_ACTIVITY_KEY = "adminLastActivity";

function getLastActivity(): number | null {
  const raw = localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function touchLastActivity(): void {
  localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
}

function isSessionExpired(): boolean {
  const last = getLastActivity();
  if (last === null) return false; // sem registro = sessão antiga ou primeira vez, não expirar
  return Date.now() - last > INACTIVITY_TIMEOUT_MS;
}

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

  const logout = useCallback(() => {
    setAdmin(null);
    localStorage.removeItem("admin");
    localStorage.removeItem("adminToken");
    localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
  }, []);

  // Carregar dados do localStorage ao inicializar
  useEffect(() => {
    const storedAdmin = localStorage.getItem("admin");
    const storedToken = localStorage.getItem("adminToken");

    if (storedAdmin && storedToken) {
      if (isSessionExpired()) {
        logout();
        setIsLoading(false);
        return;
      }
      try {
        const adminData = JSON.parse(storedAdmin);
        verifyToken(storedToken).then((isValid) => {
          if (isValid) {
            touchLastActivity();
            setAdmin({ ...adminData, token: storedToken });
          } else {
            logout();
          }
          setIsLoading(false);
        });
      } catch (error) {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [logout]);

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

  const login = async (email: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data?.message || "Credenciais inválidas.";
        setIsLoading(false);
        return { ok: false, message };
      }

      if (data.role !== "admin") {
        setIsLoading(false);
        return { ok: false, message: "Acesso restrito a administradores." };
      }

      if (!data.token) {
        setIsLoading(false);
        return { ok: false, message: "Erro ao gerar sessão. Tente novamente." };
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
      touchLastActivity();
      setIsLoading(false);
      return { ok: true };
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      setIsLoading(false);
      return { ok: false, message: "Erro de conexão. Tente novamente." };
    }
  };

  // Quando qualquer chamada admin receber 401, fazer logout
  useEffect(() => {
    setOnAdminUnauthorized(() => logout);
    return () => setOnAdminUnauthorized(null);
  }, [logout]);

  // Atualizar última atividade quando a API admin for usada (api.ts chama isso)
  useEffect(() => {
    setOnAdminActivity(touchLastActivity);
    return () => setOnAdminActivity(null);
  }, []);

  // Encerrar sessão por inatividade: checar ao focar a janela e a cada minuto
  useEffect(() => {
    if (!admin) return;

    const checkAndLogout = () => {
      if (isSessionExpired()) {
        logout();
      }
    };

    const onFocus = () => {
      // Ao voltar à aba, só verificar se passou do tempo (não atualizar atividade)
      checkAndLogout();
    };

    const intervalId = setInterval(checkAndLogout, 60 * 1000); // a cada 1 min
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [admin, logout]);

  // Atualizar última atividade com interação do usuário (mouse/teclado) no admin
  const lastTouchRef = useRef(0);
  useEffect(() => {
    if (!admin) return;

    const debounceMs = 60 * 1000; // no máximo a cada 1 min
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouchRef.current < debounceMs) return;
      lastTouchRef.current = now;
      touchLastActivity();
    };

    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
    };
  }, [admin]);

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
