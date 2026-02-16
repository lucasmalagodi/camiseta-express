import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, ArrowLeft, CheckCircle2, XCircle, Loader2, FileText, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { agencyRegistrationService, legalDocumentService, agencyLegalDocumentService } from "@/services/api";
import logo from "@/assets/logo.svg";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs as DocumentTabs, TabsContent as DocumentTabsContent, TabsList as DocumentTabsList, TabsTrigger as DocumentTabsTrigger } from "@/components/ui/tabs";

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyCode } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  
  // Carregar email salvo do localStorage ao inicializar
  const [loginData, setLoginData] = useState(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    return {
      email: savedEmail || "",
      password: "",
    };
  });
  
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem("rememberedEmail");
  });
  
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [registerData, setRegisterData] = useState({
    cnpj: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCnpj, setIsValidatingCnpj] = useState(false);
  const [cnpjValidated, setCnpjValidated] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Documentos legais
  const [legalDocuments, setLegalDocuments] = useState<{
    terms: any | null;
    privacy: any | null;
  }>({ terms: null, privacy: null });
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isViewingDocuments, setIsViewingDocuments] = useState(false);
  const [viewingDocumentType, setViewingDocumentType] = useState<'TERMS' | 'PRIVACY' | null>(null);
  
  // Documentos pendentes no login
  const [pendingDocuments, setPendingDocuments] = useState<any[]>([]);
  const [isAcceptanceDialogOpen, setIsAcceptanceDialogOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [currentPendingDocumentIndex, setCurrentPendingDocumentIndex] = useState(0);
  const [acceptedDocumentIds, setAcceptedDocumentIds] = useState<number[]>([]);
  const [storedLoginData, setStoredLoginData] = useState<{ email: string; password: string } | null>(null);

  // Carregar documentos legais ao montar o componente
  useEffect(() => {
    loadLegalDocuments();
  }, []);

  const loadLegalDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const [terms, privacy] = await Promise.all([
        legalDocumentService.getActiveByType('TERMS').catch(() => null),
        legalDocumentService.getActiveByType('PRIVACY').catch(() => null),
      ]);
      
      setLegalDocuments({ terms, privacy });
    } catch (error) {
      console.error('Erro ao carregar documentos legais:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleViewDocument = (type: 'TERMS' | 'PRIVACY') => {
    setViewingDocumentType(type);
    setIsViewingDocuments(true);
  };

  const getCurrentDocument = () => {
    if (!viewingDocumentType) return null;
    return viewingDocumentType === 'TERMS' ? legalDocuments.terms : legalDocuments.privacy;
  };

  // Carregar documento pendente completo
  const [currentPendingDocument, setCurrentPendingDocument] = useState<any | null>(null);
  const [isLoadingPendingDocument, setIsLoadingPendingDocument] = useState(false);

  useEffect(() => {
    if (isAcceptanceDialogOpen && pendingDocuments.length > 0) {
      loadCurrentPendingDocument();
    }
  }, [isAcceptanceDialogOpen, currentPendingDocumentIndex, pendingDocuments]);

  const loadCurrentPendingDocument = async () => {
    if (pendingDocuments.length === 0) return;
    
    const currentDoc = pendingDocuments[currentPendingDocumentIndex];
    if (!currentDoc) return;

    setIsLoadingPendingDocument(true);
    try {
      const doc = await legalDocumentService.getActiveByType(currentDoc.type);
      setCurrentPendingDocument(doc);
    } catch (error) {
      console.error('Erro ao carregar documento pendente:', error);
      toast.error('Erro ao carregar documento');
    } finally {
      setIsLoadingPendingDocument(false);
    }
  };

  const handleAcceptCurrentDocument = async () => {
    if (!currentPendingDocument || !storedLoginData) return;
    
    const docId = currentPendingDocument.id;
    
    // Adicionar à lista de aceitos
    if (!acceptedDocumentIds.includes(docId)) {
      setAcceptedDocumentIds([...acceptedDocumentIds, docId]);
    }

    // Se há mais documentos, avançar para o próximo
    if (currentPendingDocumentIndex < pendingDocuments.length - 1) {
      setCurrentPendingDocumentIndex(currentPendingDocumentIndex + 1);
      setCurrentPendingDocument(null);
    } else {
      // Último documento - aceitar todos e fazer login
      await handleAcceptAllDocuments();
    }
  };

  const handleAcceptAllDocuments = async () => {
    if (!storedLoginData) return;

    // Coletar todos os IDs dos documentos pendentes
    let allDocumentIds = [...pendingDocuments.map(d => d.id)];
    
    // Garantir que o documento atual também está incluído
    if (currentPendingDocument && !allDocumentIds.includes(currentPendingDocument.id)) {
      allDocumentIds.push(currentPendingDocument.id);
    }

    // Garantir que todos os documentos visualizados estão na lista
    const finalDocumentIds = [...new Set(allDocumentIds)];

    setIsAccepting(true);
    try {
      // Aceitar todos os documentos usando o endpoint especial de login
      await legalDocumentService.acceptDuringLogin(
        storedLoginData.email,
        storedLoginData.password,
        finalDocumentIds
      );

      toast.success("Documentos aceitos com sucesso!");
      setIsAcceptanceDialogOpen(false);
      
      // Tentar fazer login novamente
      const result = await login(storedLoginData.email, storedLoginData.password);
      if (result.success) {
        // Salvar email se "Lembrar-me" estiver marcado
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", storedLoginData.email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
        toast.error(result.message || "Erro ao fazer login após aceitar documentos");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao aceitar documentos");
    } finally {
      setIsAccepting(false);
      setPendingDocuments([]);
      setCurrentPendingDocumentIndex(0);
      setAcceptedDocumentIds([]);
      setStoredLoginData(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await login(loginData.email, loginData.password);
      
      if (result.success) {
        // Salvar email se "Lembrar-me" estiver marcado
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", loginData.email);
        } else {
          // Remover email salvo se desmarcar
          localStorage.removeItem("rememberedEmail");
        }
        
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else if (result.requiresAcceptance && result.pendingDocuments) {
        // Salvar dados de login temporariamente
        setStoredLoginData({ email: loginData.email, password: loginData.password });
        setPendingDocuments(result.pendingDocuments);
        setCurrentPendingDocumentIndex(0);
        setAcceptedDocumentIds([]);
        setIsAcceptanceDialogOpen(true);
        toast.info(result.message || "Você precisa aceitar os novos termos para continuar");
      } else if (result.requires2FA) {
        // Salvar email mesmo durante verificação de código
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", loginData.email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
        
        setRequiresVerification(true);
        toast.success(result.message || "Código de verificação enviado por email!");
      } else {
        toast.warning(result.message || "Email ou senha incorretos!", {
          style: {
            backgroundColor: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fbbf24",
          },
        });
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    
    const success = await verifyCode(loginData.email, verificationCode);
    
    if (success) {
      toast.success("Código verificado! Login realizado com sucesso!");
      navigate("/");
    } else {
      toast.error("Código inválido ou expirado. Verifique seu email e tente novamente.");
      setVerificationCode("");
    }
    
    setIsVerifying(false);
  };

  const handleValidateCnpj = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!registerData.cnpj.trim()) {
      setErrorMessage("CPF/CNPJ é obrigatório");
      return;
    }

    setIsValidatingCnpj(true);
    setErrorMessage(null);

    try {
      // Normalizar CNPJ (remover formatação) antes de validar
      const normalizedCnpj = registerData.cnpj.replace(/\D/g, '');
      const result = await agencyRegistrationService.validateCnpj(normalizedCnpj);
      
      // Verificar se agência já existe
      if (result.alreadyExists) {
        setCnpjValidated(false);
        setIsEligible(false);
        setErrorMessage("Este CPF/CNPJ já está cadastrado. Faça login para acessar sua conta.");
        toast.error("Este CPF/CNPJ já está cadastrado");
        return;
      }
      
      setCnpjValidated(true);
      
      if (result.eligible) {
        setIsEligible(true);
        setErrorMessage(null);
        
        // Preencher nome da agência automaticamente se disponível
        if (result.agencyName && !registerData.name) {
          setRegisterData({ ...registerData, name: result.agencyName });
        }
        
        toast.success("CPF/CNPJ válido! Preencha os dados para continuar.");
      } else {
        // Não encontrado na campanha, mas permite cadastro mesmo assim
        setIsEligible(false);
        setErrorMessage(null);
        toast.info("Suas vendas ainda não foram computadas na campanha. Faça seu cadastro normalmente — assim que a pontuação for atualizada, seus pontos aparecerão automaticamente na sua conta.");
      }
    } catch (error: any) {
      setErrorMessage("Erro ao validar CPF/CNPJ. Tente novamente.");
      toast.error("Erro ao validar CPF/CNPJ");
      console.error(error);
    } finally {
      setIsValidatingCnpj(false);
    }
  };

  const handleCnpjBlur = () => {
    if (registerData.cnpj.trim() && !cnpjValidated) {
      handleValidateCnpj();
    }
  };

  const handleCepBlur = async () => {
    const cep = registerData.address.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      return;
    }

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) {
        throw new Error("Erro ao buscar CEP");
      }
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      // Preencher campos automaticamente
      setRegisterData({
        ...registerData,
        address: {
          cep: data.cep || registerData.address.cep,
          street: data.logradouro || "",
          number: "",
          complement: "", // Sempre vazio para o usuário preencher
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        },
      });
      toast.success("Endereço preenchido automaticamente");
    } catch (error) {
      // Silenciosamente falha - usuário pode preencher manualmente
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Função para aplicar máscara de CPF/CNPJ
  const formatCnpj = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Se tiver 11 dígitos ou menos, aplica máscara de CPF: 999.999.999-99
    if (numbers.length <= 11) {
      const limitedNumbers = numbers.slice(0, 11);
      
      if (limitedNumbers.length <= 3) {
        return limitedNumbers;
      } else if (limitedNumbers.length <= 6) {
        return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
      } else if (limitedNumbers.length <= 9) {
        return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6)}`;
      } else {
        return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9, 11)}`;
      }
    } else {
      // Se tiver mais de 11 dígitos, aplica máscara de CNPJ: 00.000.000/0000-00
      const limitedNumbers = numbers.slice(0, 14);
      
      if (limitedNumbers.length <= 2) {
        return limitedNumbers;
      } else if (limitedNumbers.length <= 5) {
        return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
      } else if (limitedNumbers.length <= 8) {
        return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`;
      } else if (limitedNumbers.length <= 12) {
        return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
      } else {
        return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8, 12)}-${limitedNumbers.slice(12, 14)}`;
      }
    }
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    setRegisterData({ ...registerData, cnpj: formatted });
    // Resetar validação se CNPJ for alterado
    if (cnpjValidated) {
      setCnpjValidated(false);
      setIsEligible(false);
      setErrorMessage(null);
    }
  };

  // Função para aplicar máscara de CEP
  const formatCep = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 8 dígitos (CEP tem 8 dígitos)
    const limitedNumbers = numbers.slice(0, 8);
    
    // Aplica a máscara: 00000-000
    if (limitedNumbers.length <= 5) {
      return limitedNumbers;
    } else {
      return `${limitedNumbers.slice(0, 5)}-${limitedNumbers.slice(5, 8)}`;
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setRegisterData({
      ...registerData,
      address: { ...registerData.address, cep: formatted }
    });
  };

  // Função para aplicar máscara de telefone brasileiro
  const formatPhone = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (máximo para celular)
    const limitedNumbers = numbers.slice(0, 11);
    
    // Aplica a máscara baseada no tamanho
    if (limitedNumbers.length <= 2) {
      return limitedNumbers.length > 0 ? `(${limitedNumbers}` : '';
    } else if (limitedNumbers.length <= 6) {
      return `(${limitedNumbers.slice(0, 2)})${limitedNumbers.slice(2)}`;
    } else if (limitedNumbers.length <= 10) {
      // Telefone fixo: (99)9999-9999
      return `(${limitedNumbers.slice(0, 2)})${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6)}`;
    } else {
      // Celular: (99)99999-9999
      return `(${limitedNumbers.slice(0, 2)})${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setRegisterData({ ...registerData, phone: formatted });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar formato do CNPJ, mas não bloquear se não encontrar na campanha
    if (!registerData.cnpj.trim()) {
      toast.error("CPF/CNPJ é obrigatório");
      return;
    }

    // Validar formato básico do CNPJ (11 ou 14 dígitos)
    const normalizedCnpj = registerData.cnpj.replace(/\D/g, '');
    if (normalizedCnpj.length !== 11 && normalizedCnpj.length !== 14) {
      toast.error("CPF/CNPJ inválido. CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setErrorMessage("As senhas não coincidem!");
      toast.error("As senhas não coincidem!");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("Você deve aceitar os termos de serviço");
      toast.error("Você deve aceitar os termos de serviço");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Normalizar telefone e CNPJ (remover formatação) antes de enviar
      const normalizedPhone = registerData.phone.replace(/\D/g, '');
      const normalizedCnpj = registerData.cnpj.replace(/\D/g, '');
      const normalizedCep = registerData.address.cep.replace(/\D/g, '');
      
      // Coletar IDs dos documentos aceitos
      const acceptedDocumentIds: number[] = [];
      if (legalDocuments.terms) {
        acceptedDocumentIds.push(legalDocuments.terms.id);
      }
      if (legalDocuments.privacy) {
        acceptedDocumentIds.push(legalDocuments.privacy.id);
      }
      
      await agencyRegistrationService.register({
        cnpj: normalizedCnpj,
        name: registerData.name,
        email: registerData.email,
        phone: normalizedPhone,
        address: {
          ...registerData.address,
          cep: normalizedCep
        },
        password: registerData.password,
        acceptedLegalDocuments: acceptedDocumentIds,
      });

      toast.success("Agência registrada com sucesso! Faça login para continuar.");
      // Reset form and switch to login tab
      setRegisterData({
        cnpj: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        address: {
          cep: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
        },
      });
      setCnpjValidated(false);
      setIsEligible(false);
      setTermsAccepted(false);
      setErrorMessage(null);
      
      // Switch to login tab
      setActiveTab("login");
    } catch (error: any) {
      const errorMsg = error.message || "Erro ao registrar agência";
      setErrorMessage(errorMsg);
      
      if (errorMsg.includes("já cadastrada") || errorMsg.includes("already exists")) {
        toast.error("Agência já cadastrada");
      } else if (errorMsg.includes("não autorizado") || errorMsg.includes("no imported points")) {
        toast.error("CPF/CNPJ não autorizado para esta campanha");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center px-4 py-12 relative ${requiresVerification ? 'pt-24' : ''}`}>
      {/* Banner fixo de verificação de dispositivo */}
      {requiresVerification && (
        <div className="fixed top-0 left-0 right-0 w-full bg-primary text-primary-foreground py-4 z-50 shadow-lg">
          <div className="max-w-md mx-auto px-4 text-center">
            <p className="text-base font-medium">
              <strong>🔐 Verificação de Dispositivo</strong>
              <br />
              <span className="text-sm opacity-90">
                Enviamos um código de 6 dígitos para <strong>{loginData.email}</strong>
              </span>
            </p>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          {!requiresVerification && (
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          <div className="flex items-center justify-center mb-4">
            <img src={logo} alt="Logo" className="h-16" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo</h1>
          <p className="text-muted-foreground mt-2">
            Entre na sua conta ou crie uma nova
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={requiresVerification ? undefined : setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="login" 
              className="flex items-center gap-2"
              disabled={requiresVerification}
            >
              <LogIn className="w-4 h-4" />
              Login
            </TabsTrigger>
            <TabsTrigger 
              value="register" 
              className="flex items-center gap-2"
              disabled={requiresVerification}
            >
              <UserPlus className="w-4 h-4" />
              Registrar
            </TabsTrigger>
          </TabsList>

          {/* Login Form */}
          <TabsContent value="login" className="mt-6">
            {!requiresVerification ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    checked={rememberMe}
                    onChange={(e) => {
                      setRememberMe(e.target.checked);
                      // Se desmarcar, remover email salvo
                      if (!e.target.checked) {
                        localStorage.removeItem("rememberedEmail");
                      }
                    }}
                  />
                  Lembrar-me
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Acessando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Código de Verificação</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                    }}
                    maxLength={6}
                    required
                    className="text-center text-2xl tracking-widest font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Digite o código de 6 dígitos enviado por email
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setRequiresVerification(false);
                      setVerificationCode("");
                    }}
                    disabled={isVerifying}
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    size="lg" 
                    disabled={isVerifying || verificationCode.length !== 6}
                  >
                    {isVerifying ? "Verificando..." : "Verificar Código"}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          {/* Register Form */}
          <TabsContent value="register" className="mt-6">
            <form onSubmit={cnpjValidated ? handleRegister : handleValidateCnpj} className="space-y-4">
              {/* Alerta quando CNPJ não encontrado na campanha - no topo */}
              {cnpjValidated && !isEligible && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Suas vendas ainda não foram computadas na campanha.</strong>
                    <br />
                    Faça seu cadastro normalmente — assim que a pontuação for atualizada, seus pontos aparecerão automaticamente na sua conta.
                  </p>
                </div>
              )}
              
              {/* Step 1: CNPJ Validation */}
              <div className="space-y-2">
                <Label htmlFor="register-cnpj">CPF/CNPJ</Label>
                <div className="flex gap-2">
                  <Input
                    id="register-cnpj"
                    type="text"
                    placeholder="999.999.999-99 ou 00.000.000/0000-00"
                    value={registerData.cnpj}
                    onChange={handleCnpjChange}
                    onBlur={handleCnpjBlur}
                    disabled={cnpjValidated && isEligible}
                    maxLength={18}
                    required
                    className={cnpjValidated && isEligible ? "bg-muted" : ""}
                  />
                  {cnpjValidated && (
                    <div className="flex items-center">
                      {isEligible ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {errorMessage && !cnpjValidated && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}

              {/* Step 2: Registration Form (shown after CNPJ validation, even if not found in campaign) */}
              {cnpjValidated && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Nome da agência"
                      value={registerData.name}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Telefone</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="(00)00000-0000 ou (00)0000-0000"
                      value={registerData.phone}
                      onChange={handlePhoneChange}
                      maxLength={15}
                      required
                    />
                  </div>
                  {/* Address Fields */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-medium">Endereço</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-cep">CEP</Label>
                      <Input
                        id="register-cep"
                        type="text"
                        placeholder="00000-000"
                        value={registerData.address.cep}
                        onChange={handleCepChange}
                        onBlur={handleCepBlur}
                        disabled={isLoadingCep}
                        maxLength={9}
                        required
                      />
                      {isLoadingCep && (
                        <p className="text-xs text-muted-foreground">Buscando CEP...</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-street">Rua</Label>
                        <Input
                          id="register-street"
                          type="text"
                          placeholder="Nome da rua"
                          value={registerData.address.street}
                          onChange={(e) =>
                            setRegisterData({
                              ...registerData,
                              address: { ...registerData.address, street: e.target.value }
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-number">Número</Label>
                        <Input
                          id="register-number"
                          type="text"
                          placeholder="123"
                          value={registerData.address.number}
                          onChange={(e) =>
                            setRegisterData({
                              ...registerData,
                              address: { ...registerData.address, number: e.target.value }
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-complement">Complemento (opcional)</Label>
                      <Input
                        id="register-complement"
                        type="text"
                        placeholder="Apto, bloco, etc."
                        value={registerData.address.complement}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-neighborhood">Bairro</Label>
                      <Input
                        id="register-neighborhood"
                        type="text"
                        placeholder="Nome do bairro"
                        value={registerData.address.neighborhood}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            address: { ...registerData.address, neighborhood: e.target.value }
                          })
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-city">Cidade</Label>
                        <Input
                          id="register-city"
                          type="text"
                          placeholder="Nome da cidade"
                          value={registerData.address.city}
                          onChange={(e) =>
                            setRegisterData({
                              ...registerData,
                              address: { ...registerData.address, city: e.target.value }
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-state">Estado (UF)</Label>
                        <Input
                          id="register-state"
                          type="text"
                          placeholder="SP"
                          maxLength={2}
                          value={registerData.address.state}
                          onChange={(e) =>
                            setRegisterData({
                              ...registerData,
                              address: { ...registerData.address, state: e.target.value.toUpperCase() }
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">
                      Confirmar senha
                    </Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  {errorMessage && (
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      required
                    />
                    <label className="flex items-center gap-1 flex-wrap">
                      Eu concordo com os{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewDocument('TERMS');
                        }}
                        className="text-primary hover:underline font-medium flex items-center gap-1"
                        disabled={!legalDocuments.terms}
                      >
                        {isLoadingDocuments ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <FileText className="w-3 h-3" />
                            termos de serviço
                          </>
                        )}
                      </button>{" "}
                      e{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewDocument('PRIVACY');
                        }}
                        className="text-primary hover:underline font-medium flex items-center gap-1"
                        disabled={!legalDocuments.privacy}
                      >
                        {isLoadingDocuments ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <FileText className="w-3 h-3" />
                            política de privacidade
                          </>
                        )}
                      </button>
                    </label>
                  </div>
                  {(!legalDocuments.terms || !legalDocuments.privacy) && !isLoadingDocuments && (
                    <p className="text-xs text-yellow-600">
                      ⚠️ Documentos legais não disponíveis. Entre em contato com o suporte.
                    </p>
                  )}
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={
                  isLoading ||
                  isValidatingCnpj ||
                  !registerData.cnpj.trim() ||
                  (cnpjValidated && (!termsAccepted || !registerData.name || !registerData.email || !registerData.password || !registerData.phone || !registerData.address.cep || !registerData.address.street || !registerData.address.number || !registerData.address.neighborhood || !registerData.address.city || !registerData.address.state))
                }
              >
                {isValidatingCnpj ? (
                  "Validando..."
                ) : isLoading ? (
                  "Registrando..."
                ) : cnpjValidated ? (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar conta
                  </>
                ) : (
                  "Validar CNPJ"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para visualizar documentos legais */}
      <Dialog open={isViewingDocuments} onOpenChange={setIsViewingDocuments}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingDocumentType === 'TERMS' ? 'Termos de Serviço' : 'Política de Privacidade'}
            </DialogTitle>
            <DialogDescription>
              {getCurrentDocument() && (
                `Versão ${getCurrentDocument()!.version} - Atualizada em ${new Date(getCurrentDocument()!.created_at).toLocaleDateString('pt-BR')}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          {getCurrentDocument() ? (
            <div className="space-y-4">
              <div
                className="prose max-w-none p-4 border rounded-lg bg-muted/50 max-h-[60vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ 
                  __html: getCurrentDocument()!.content 
                }}
              />
            </div>
          ) : (
            <p className="text-muted-foreground">Documento não disponível.</p>
          )}

          <DialogFooter>
            <Button onClick={() => setIsViewingDocuments(false)}>Fechar</Button>
            <Button
              onClick={() => {
                setTermsAccepted(true);
                setIsViewingDocuments(false);
                toast.success("Documento visualizado. Você pode prosseguir com o cadastro.");
              }}
              variant="default"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aceitar e Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para aceitar documentos pendentes no login */}
      <Dialog open={isAcceptanceDialogOpen} onOpenChange={(open) => {
        if (!open && !isAccepting) {
          // Só permitir fechar se não estiver aceitando
          setIsAcceptanceDialogOpen(false);
          setPendingDocuments([]);
          setStoredLoginData(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Aceitar Termos e Políticas
            </DialogTitle>
            <DialogDescription>
              {pendingDocuments.length > 0 && (
                `Você precisa aceitar ${pendingDocuments.length} documento(s) para continuar. ` +
                `Documento ${currentPendingDocumentIndex + 1} de ${pendingDocuments.length}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingPendingDocument ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : currentPendingDocument ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {currentPendingDocument.type === 'TERMS' ? 'Termos de Serviço' : 
                     currentPendingDocument.type === 'PRIVACY' ? 'Política de Privacidade' : 
                     'Regras da Campanha'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Versão {currentPendingDocument.version} - Atualizada em{" "}
                    {new Date(currentPendingDocument.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <div
                className="prose max-w-none p-4 border rounded-lg bg-muted/50 max-h-[50vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ 
                  __html: currentPendingDocument.content 
                }}
              />
            </div>
          ) : (
            <p className="text-muted-foreground">Carregando documento...</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAcceptanceDialogOpen(false);
                setPendingDocuments([]);
                setStoredLoginData(null);
              }}
              disabled={isAccepting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAcceptCurrentDocument}
              disabled={isAccepting || isLoadingPendingDocument || !currentPendingDocument}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aceitando...
                </>
              ) : currentPendingDocumentIndex < pendingDocuments.length - 1 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aceitar e Próximo
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aceitar e Continuar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
