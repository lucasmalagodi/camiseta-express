import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { agencyRegistrationService } from "@/services/api";
import logo from "@/assets/logo.svg";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await login(loginData.email, loginData.password);
    
    if (success) {
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } else {
      toast.warning("Email ou senha incorretos!", {
        style: {
          backgroundColor: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fbbf24",
        },
      });
    }
    
    setIsLoading(false);
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
      
      if (result.eligible) {
        setCnpjValidated(true);
        setIsEligible(true);
        setErrorMessage(null);
        
        // Preencher nome da agência automaticamente se disponível
        if (result.agencyName && !registerData.name) {
          setRegisterData({ ...registerData, name: result.agencyName });
        }
        
        toast.success("CPF/CNPJ válido! Preencha os dados para continuar.");
      } else {
        setIsEligible(false);
        setCnpjValidated(true);
        setErrorMessage("CPF/CNPJ não encontrado na campanha");
        toast.error("CPF/CNPJ não encontrado na campanha");
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

    if (!cnpjValidated || !isEligible) {
      toast.error("Valide o CPF/CNPJ primeiro");
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center justify-center mb-4">
            <img src={logo} alt="Logo" className="h-16" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo</h1>
          <p className="text-muted-foreground mt-2">
            Entre na sua conta ou crie uma nova
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Registrar
            </TabsTrigger>
          </TabsList>

          {/* Login Form */}
          <TabsContent value="login" className="mt-6">
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
                  <input type="checkbox" className="rounded" />
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
                <LogIn className="w-4 h-4 mr-2" />
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          {/* Register Form */}
          <TabsContent value="register" className="mt-6">
            <form onSubmit={cnpjValidated && isEligible ? handleRegister : handleValidateCnpj} className="space-y-4">
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
                {cnpjValidated && !isEligible && (
                  <p className="text-sm text-red-600">CPF/CNPJ não encontrado na campanha</p>
                )}
              </div>

              {errorMessage && !cnpjValidated && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}

              {/* Step 2: Registration Form (only shown if CNPJ is eligible) */}
              {cnpjValidated && isEligible && (
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
                    <label>
                      Eu concordo com os{" "}
                      <a href="#" className="text-primary hover:underline">
                        termos de serviço
                      </a>{" "}
                      e{" "}
                      <a href="#" className="text-primary hover:underline">
                        política de privacidade
                      </a>
                    </label>
                  </div>
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
                  (cnpjValidated && isEligible && (!termsAccepted || !registerData.name || !registerData.email || !registerData.password || !registerData.phone || !registerData.address.cep || !registerData.address.street || !registerData.address.number || !registerData.address.neighborhood || !registerData.address.city || !registerData.address.state))
                }
              >
                {isValidatingCnpj ? (
                  "Validando..."
                ) : isLoading ? (
                  "Registrando..."
                ) : cnpjValidated && isEligible ? (
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
    </div>
  );
};

export default Login;
