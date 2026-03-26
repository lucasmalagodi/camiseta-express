import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { setOnAgencyUnauthorized, setOnAgencyActivity } from "@/services/api";

interface Agency {
  id: number;
  name: string;
  email: string;
  points: number;
  token?: string;
}

interface PendingDocument {
  id: number;
  type: string;
  version: number;
}

interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  requiresAcceptance?: boolean;
  pendingDocuments?: PendingDocument[];
  message?: string;
}

interface AuthContextType {
  agency: Agency | null;
  /** true após tentar restaurar sessão do localStorage (evita request sem agencyId no F5) */
  authChecked: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  updatePoints: (points: number) => void;
  refreshPoints: () => Promise<void>;
  forceRefreshPoints: () => Promise<void>;
  isRefreshingPoints: boolean;
  canRefreshPoints: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Encerrar sessão da agência após este tempo sem atividade (ex.: 24h = 1 dia)
const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const AGENCY_LAST_ACTIVITY_KEY = "agencyLastActivity";

function getAgencyLastActivity(): number | null {
  const raw = localStorage.getItem(AGENCY_LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function touchAgencyLastActivity(): void {
  localStorage.setItem(AGENCY_LAST_ACTIVITY_KEY, String(Date.now()));
}

function isAgencySessionExpired(): boolean {
  const last = getAgencyLastActivity();
  if (last === null) return false;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isRefreshingPoints, setIsRefreshingPoints] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const isRefreshingRef = useRef(false);

  const logout = useCallback(() => {
    setAgency(null);
    localStorage.removeItem("agency");
    localStorage.removeItem("agencyToken");
    localStorage.removeItem(AGENCY_LAST_ACTIVITY_KEY);
  }, []);

  // Carregar dados do localStorage ao inicializar (rodar antes de páginas que dependem de agency)
  useEffect(() => {
    const storedAgency = localStorage.getItem("agency");
    const storedToken = localStorage.getItem("agencyToken");
    if (storedAgency && storedToken) {
      if (isAgencySessionExpired()) {
        logout();
        setAuthChecked(true);
        return;
      }
      const agencyData = JSON.parse(storedAgency);
      agencyData.token = storedToken;
      localStorage.setItem("agency", JSON.stringify(agencyData));
      touchAgencyLastActivity();
      setAgency(agencyData);
    } else if (storedAgency && !storedToken) {
      localStorage.removeItem("agency");
      setAgency(null);
    }
    setAuthChecked(true);
  }, [logout]);

  // Sincronizar token sempre que o agency mudar
  useEffect(() => {
    if (agency && !agency.token) {
      const storedToken = localStorage.getItem("agencyToken");
      if (storedToken) {
        const updatedAgency = { ...agency, token: storedToken };
        setAgency(updatedAgency);
        localStorage.setItem("agency", JSON.stringify(updatedAgency));
      }
    }
  }, [agency]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const API_URL = getApiUrl();
      console.log("Tentando fazer login em:", `${API_URL}/agencies/login`);

      const response = await fetch(`${API_URL}/agencies/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Importante para receber cookies
        body: JSON.stringify({ email, password }),
      });

      console.log("Resposta recebida:", response.status, response.statusText);

      let data: any;
      try {
        data = await response.json();
        console.log("Dados recebidos:", data);
      } catch (jsonError) {
        console.error("Erro ao parsear JSON:", jsonError);
        const text = await response.text();
        console.error("Resposta do servidor (texto):", text);
        return { success: false, message: "Resposta inválida do servidor" };
      }

      if (!response.ok) {
        // Verificar se requer aceitação de documentos
        if (response.status === 403 && data?.requiresAcceptance) {
          return {
            success: false,
            requiresAcceptance: true,
            pendingDocuments: data.pendingDocuments || [],
            message: data.message || "Você precisa aceitar os novos termos e políticas para continuar"
          };
        }
        // Usar a mensagem retornada pela API (inclui 500 com message)
        const errorMsg = data?.message || (response.status >= 500 ? "Erro no servidor. Tente novamente mais tarde." : "Erro ao fazer login");
        console.error("Erro no login:", errorMsg);
        return { success: false, message: errorMsg };
      }

      // Verificar se requer verificação de código
      if (data.requires2FA) {
        return { 
          success: false, 
          requires2FA: true, 
          message: data.message || "Código de verificação enviado por email" 
        };
      }

      const agencyData: Agency = {
        id: data.id,
        name: data.name,
        email: data.email,
        points: data.balance || 0,
        token: data.token,
      };
      setAgency(agencyData);
      localStorage.setItem("agency", JSON.stringify(agencyData));
      if (data.token) {
        localStorage.setItem("agencyToken", data.token);
      }
      touchAgencyLastActivity();
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      const errorMessage = error?.message || "Erro ao conectar com o servidor";
      console.error("Detalhes do erro:", {
        message: errorMessage,
        stack: error?.stack,
        name: error?.name
      });
      return { 
        success: false, 
        message: errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")
          ? "Não foi possível conectar ao servidor. Verifique sua conexão."
          : errorMessage
      };
    }
  };

  const verifyCode = async (email: string, code: string): Promise<boolean> => {
    try {
      const API_URL = getApiUrl();

      const response = await fetch(`${API_URL}/agencies/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Importante para receber cookies
        body: JSON.stringify({ email, code }),
      });

      let data: any;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Erro ao parsear JSON:", jsonError);
        return false;
      }

      if (!response.ok) {
        console.error("Erro na verificação:", data?.message || "Erro desconhecido");
        return false;
      }

      const agencyData: Agency = {
        id: data.id,
        name: data.name,
        email: data.email,
        points: data.balance || 0,
        token: data.token,
      };
      setAgency(agencyData);
      localStorage.setItem("agency", JSON.stringify(agencyData));
      if (data.token) {
        localStorage.setItem("agencyToken", data.token);
      }
      touchAgencyLastActivity();
      return true;
    } catch (error: any) {
      console.error("Erro ao verificar código:", error);
      const errorMessage = error?.message || "Erro ao verificar código";
      console.error("Detalhes do erro:", {
        message: errorMessage,
        stack: error?.stack
      });
      return false;
    }
  };

  // 401 em rota de agência → logout
  useEffect(() => {
    setOnAgencyUnauthorized(() => logout);
    return () => setOnAgencyUnauthorized(null);
  }, [logout]);

  // Atualizar última atividade quando a API de agência for usada
  useEffect(() => {
    setOnAgencyActivity(touchAgencyLastActivity);
    return () => setOnAgencyActivity(null);
  }, []);

  // Encerrar sessão por inatividade: checar ao focar a janela e a cada minuto
  useEffect(() => {
    if (!agency) return;
    const checkAndLogout = () => {
      if (isAgencySessionExpired()) {
        logout();
      }
    };
    const onFocus = () => checkAndLogout();
    const intervalId = setInterval(checkAndLogout, 60 * 1000);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [agency, logout]);

  // Atualizar última atividade com interação do usuário (mouse/teclado)
  const lastAgencyTouchRef = useRef(0);
  useEffect(() => {
    if (!agency) return;
    const debounceMs = 60 * 1000;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastAgencyTouchRef.current < debounceMs) return;
      lastAgencyTouchRef.current = now;
      touchAgencyLastActivity();
    };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
    };
  }, [agency]);

  const updatePoints = useCallback((points: number) => {
    setAgency((prevAgency) => {
      if (prevAgency) {
        // Garantir que o token seja mantido
        const storedToken = localStorage.getItem("agencyToken");
        const updatedAgency = { 
          ...prevAgency, 
          points,
          token: prevAgency.token || storedToken || undefined
        };
        localStorage.setItem("agency", JSON.stringify(updatedAgency));
        return updatedAgency;
      }
      return prevAgency;
    });
  }, []);

  const refreshPoints = useCallback(async () => {
    console.log("refreshPoints chamado");
    console.log("agency:", agency ? { id: agency.id, name: agency.name, hasToken: !!agency.token } : "null");
    console.log("agency?.token:", agency?.token ? `${agency.token.substring(0, 20)}...` : "não existe");
    console.log("isRefreshingRef.current:", isRefreshingRef.current);
    console.log("lastRefreshTime:", lastRefreshTime);

    // Tentar pegar o token do localStorage se não estiver no agency
    let token = agency?.token;
    if (!token) {
      const storedToken = localStorage.getItem("agencyToken");
      console.log("Token não encontrado no agency, tentando localStorage:", storedToken ? "encontrado" : "não encontrado");
      token = storedToken || undefined;
    }

    if (!token) {
      console.log("Bloqueado: sem token (nem no agency nem no localStorage)");
      console.log("Solução: Faça logout e login novamente para gerar o token");
      return;
    }

    console.log("Token encontrado, continuando...");

    // Prevenir múltiplas chamadas simultâneas
    if (isRefreshingRef.current) {
      console.log("Bloqueado: já está atualizando");
      return;
    }

    // Verificar cooldown de 5 minutos
    const now = Date.now();
    const cooldownMs = 5 * 60 * 1000; // 5 minutos
    if (lastRefreshTime && (now - lastRefreshTime) < cooldownMs) {
      const remainingTime = Math.ceil((cooldownMs - (now - lastRefreshTime)) / 1000);
      console.log(`Bloqueado: ainda em cooldown (${remainingTime}s restantes)`);
      return;
    }

    console.log("Iniciando atualização de pontos...");
    // Marcar como atualizando
    isRefreshingRef.current = true;
    setIsRefreshingPoints(true);

    try {
      const API_URL = getApiUrl();

      console.log("Fazendo requisição para:", `${API_URL}/agencies/points/summary`);
      console.log("Token:", token ? `${token.substring(0, 20)}...` : "não existe");

      const response = await fetch(`${API_URL}/agencies/points/summary`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Resposta recebida:", response.status, response.statusText);

      if (response.status === 401) {
        logout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        console.log("Dados recebidos:", data);
        updatePoints(data.currentPoints);
        setLastRefreshTime(now);
        console.log("Pontos atualizados com sucesso!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro ao atualizar pontos:", response.status, errorData);
      }
    } catch (error) {
      console.error("Erro ao atualizar pontos:", error);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshingPoints(false);
      console.log("Atualização finalizada");
    }
  }, [agency?.token, lastRefreshTime, updatePoints, logout]);

  // Forçar atualização de pontos (ignora cooldown - usado após checkout)
  const forceRefreshPoints = useCallback(async () => {
    // Tentar pegar o token do localStorage se não estiver no agency
    let token = agency?.token;
    if (!token) {
      const storedToken = localStorage.getItem("agencyToken");
      token = storedToken || undefined;
    }

    if (!token) {
      console.log("forceRefreshPoints: sem token");
      return;
    }

    // Não verificar cooldown - forçar atualização
    isRefreshingRef.current = true;
    setIsRefreshingPoints(true);

    try {
      const API_URL = getApiUrl();

      const response = await fetch(`${API_URL}/agencies/points/summary`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        logout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        updatePoints(data.currentPoints);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro ao forçar atualização de pontos:", response.status, errorData);
      }
    } catch (error) {
      console.error("Erro ao forçar atualização de pontos:", error);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshingPoints(false);
    }
  }, [agency?.token, updatePoints, logout]);

  // Calcular se pode atualizar (não está em loading e passou o cooldown)
  const canRefreshPoints = useMemo(() => {
    if (isRefreshingPoints) {
      console.log("canRefreshPoints: false (isRefreshingPoints)");
      return false;
    }
    if (!lastRefreshTime) {
      console.log("canRefreshPoints: true (sem lastRefreshTime)");
      return true;
    }
    const cooldownMs = 5 * 60 * 1000; // 5 minutos
    const timeSinceLastRefresh = Date.now() - lastRefreshTime;
    const canRefresh = timeSinceLastRefresh >= cooldownMs;
    console.log("canRefreshPoints:", canRefresh, "timeSinceLastRefresh:", Math.round(timeSinceLastRefresh / 1000), "s");
    return canRefresh;
  }, [isRefreshingPoints, lastRefreshTime]);

  // Polling para atualizar pontos a cada 10 minutos
  useEffect(() => {
    if (!agency?.token) return;

    const API_URL = getApiUrl();

    const token = agency.token; // Capturar token para usar dentro do closure

    const pollPoints = async () => {
      try {
        const response = await fetch(`${API_URL}/agencies/points/summary`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          logout();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          updatePoints(data.currentPoints);
        }
      } catch (error) {
        console.error("Erro ao atualizar pontos:", error);
        // Mantém o último valor conhecido
      }
    };

    // Polling imediato ao montar (se já estiver autenticado)
    pollPoints();

    // Configurar polling a cada 10 minutos (600000 ms)
    const intervalId = setInterval(pollPoints, 10 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [agency?.token, updatePoints, logout]);

  // isAuthenticated deve verificar tanto agency quanto token
  const isAuthenticated = useMemo(() => {
    return !!(agency && agency.token);
  }, [agency]);

  return (
    <AuthContext.Provider
      value={{
        agency,
        authChecked,
        login,
        verifyCode,
        logout,
        isAuthenticated,
        updatePoints,
        refreshPoints,
        forceRefreshPoints,
        isRefreshingPoints,
        canRefreshPoints,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
