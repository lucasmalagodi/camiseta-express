// Helper para obter a URL da API
const getApiUrl = (): string => {
  // Se VITE_API_URL está definido, usar
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Se estamos no browser, verificar se é localhost
  if (typeof window !== 'undefined' && window.location) {
    // Se está em localhost, usar a porta de desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return "http://localhost:5001/api";
    }
    // Caso contrário, usar URL relativa (Nginx fará proxy)
    return "/api";
  }
  
  // Fallback: usar /api (URL relativa)
  return "/api";
};

// Serviço para chamadas à API
// IMPORTANTE: Sempre obter a URL em runtime, não em build time
// Isso garante que window.location esteja disponível e correto
const getApiUrlValue = () => {
  // Sempre reavaliar para garantir que está correto
  return getApiUrl();
};

// Helper para obter a base URL das imagens/assets
const getAssetsBaseUrl = (): string => {
  // Prioridade 1: Se VITE_API_URL está definido, usar (removendo /api se presente)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  
  // Prioridade 2: Se estamos no browser, SEMPRE usar window.location.origin
  // Isso garante que em produção use o domínio correto (https://onxp.com.br)
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // Fallback: string vazia (será tratado como URL relativa)
  return "";
};

// Função helper para fazer requisições autenticadas
const getAuthHeaders = () => {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Função helper para requisições autenticadas de agência
const getAgencyAuthHeaders = () => {
  const token = localStorage.getItem("agencyToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Função helper para requisições públicas (sem autenticação)
const getPublicHeaders = () => {
  return {
    "Content-Type": "application/json",
  };
};

// Categorias
export const categoryService = {
  async getAll() {
    try {
      const url = `${getApiUrlValue()}/categories`;
      const headers = getAuthHeaders();
      
      const response = await fetch(url, {
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro ao buscar categorias:", response.status, errorData);
        throw new Error(errorData.message || `Erro ao buscar categorias: ${response.status}`);
      }
      
      const data = await response.json();
      
      // A API retorna { data: [...], total: number }
      const categories = data.data || data || [];
      return Array.isArray(categories) ? categories : [];
    } catch (error: any) {
      console.error("Erro ao buscar categorias:", error);
      throw error;
    }
  },

  async create(name: string) {
    const response = await fetch(`${getApiUrlValue()}/categories`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Erro ao criar categoria");
    return await response.json();
  },

  async update(id: number, name: string) {
    const response = await fetch(`${getApiUrlValue()}/categories/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Erro ao atualizar categoria");
    return await response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/categories/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao desativar categoria");
    return await response.json();
  },
};

// Produtos
export const productService = {
  async getAll(filters?: { categoryId?: number; active?: boolean; name?: string }) {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.append("categoryId", filters.categoryId.toString());
    if (filters?.active !== undefined) params.append("active", filters.active.toString());
    if (filters?.name) params.append("name", filters.name);

    const queryString = params.toString();
    const url = `${getApiUrlValue()}/products${queryString ? `?${queryString}` : ""}`;
    
    const response = await fetch(url, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar produtos");
    const data = await response.json();
    return data.data || [];
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/products/${id}`, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar produto");
    return await response.json();
  },

  async create(data: { categoryId: number; name: string; description: string; quantity?: number }) {
    const response = await fetch(`${getApiUrlValue()}/products`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Erro ao criar produto");
    return await response.json();
  },

  async update(id: number, data: { categoryId?: number; name?: string; description?: string; quantity?: number; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/products/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Erro ao atualizar produto");
    return await response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/products/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao desativar produto");
    return await response.json();
  },

  // Função helper para buscar produto completo (com imagens e preços) no formato do frontend
  async getProductForFrontend(productId: number, agencyId?: number) {
    try {
      // Usar endpoint otimizado que retorna tudo em uma requisição
      const params = new URLSearchParams();
      if (agencyId) {
        params.append('agencyId', agencyId.toString());
      }
      
      const queryString = params.toString();
      const url = `${getApiUrlValue()}/products/${productId}/details${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: getPublicHeaders(),
      });
      
      if (!response.ok) {
        throw new Error("Erro ao buscar produto");
      }
      
      const product = await response.json();
      
      // Mapear imagens ativas (priorizar favorita)
      const activeImages = product.images?.filter((img: any) => img.active) || [];
      // Ordenar: favorita primeiro, depois por displayOrder
      const sortedImages = activeImages.sort((a: any, b: any) => {
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });
      const imagePaths = sortedImages.map((img: any) => {
        // Se a imagem já é uma URL completa, retornar como está
        if (img.path.startsWith('http')) {
          return img.path;
        }
        // Se começa com /assets ou /src/assets, construir URL completa
        if (img.path.startsWith('/assets') || img.path.startsWith('/src/assets')) {
          const API_BASE = getAssetsBaseUrl();
          return `${API_BASE}${img.path}`;
        }
        return img.path;
      });

      return {
        id: product.id,
        variants: product.variants || [],
        codigo: `CAM-${String(product.id).padStart(3, '0')}`,
        nome: product.name,
        descricao: product.description || "",
        modelo: "Standard",
        valor: Number(product.maiorPreco) || 0,
        valorPrimeiroLote: product.loteDisponivel ? Number(product.loteDisponivel.value) : Number(product.primeiroLote) || 0,
        imagens: imagePaths.length > 0 ? imagePaths : ["/src/assets/tshirt-hero.png"],
        quantity: product.quantity !== undefined ? Number(product.quantity) : undefined,
        agencyPurchaseCount: product.agencyPurchaseCount !== undefined ? Number(product.agencyPurchaseCount) : undefined,
        podeComprar: product.podeComprar !== undefined ? product.podeComprar : true,
        loteDisponivel: product.loteDisponivel || null,
      };
    } catch (error) {
      console.error("Erro ao buscar produto completo:", error);
      throw error;
    }
  },

  // Função helper para buscar todos os produtos no formato do frontend
  async getAllForFrontend(filters?: { categoryId?: number; active?: boolean; name?: string }, agencyId?: number) {
    try {
      // Usar endpoint otimizado que retorna tudo em uma requisição
      const params = new URLSearchParams();
      if (filters?.categoryId) params.append("categoryId", filters.categoryId.toString());
      if (filters?.active !== undefined) params.append("active", filters.active.toString());
      if (filters?.name) params.append("name", filters.name);
      if (agencyId) params.append("agencyId", agencyId.toString());
      params.append("withDetails", "true"); // Solicitar detalhes incluídos

      const queryString = params.toString();
      const url = `${getApiUrlValue()}/products${queryString ? `?${queryString}` : "?withDetails=true"}`;
      
      const response = await fetch(url, {
        headers: getPublicHeaders(),
      });
      if (!response.ok) throw new Error("Erro ao buscar produtos");
      const data = await response.json();
      const products = data.data || [];

      // Transformar para formato do frontend
      const productsWithDetails = products.map((product: any) => {
        // Ordenar imagens: favorita primeiro, depois por displayOrder
        const sortedImages = (product.images || []).sort((a: any, b: any) => {
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        });
        const imagePaths = sortedImages.map((img: any) => {
          if (img.path.startsWith('http')) {
            return img.path;
          }
          if (img.path.startsWith('/assets') || img.path.startsWith('/src/assets')) {
            const API_BASE = getAssetsBaseUrl();
            return `${API_BASE}${img.path}`;
          }
          return img.path;
        }) || [];

        return {
          id: product.id,
          codigo: `CAM-${String(product.id).padStart(3, '0')}`,
          nome: product.name,
          descricao: product.description || "",
          modelo: "Standard",
          valor: Number(product.maiorPreco) || 0,
          valorPrimeiroLote: product.loteDisponivel ? Number(product.loteDisponivel.value) : Number(product.primeiroLote) || 0,
          imagens: imagePaths.length > 0 ? imagePaths : ["/src/assets/tshirt-hero.png"],
          quantity: product.quantity !== undefined ? Number(product.quantity) : undefined,
          agencyPurchaseCount: product.agencyPurchaseCount !== undefined ? Number(product.agencyPurchaseCount) : undefined,
          podeComprar: product.podeComprar !== undefined ? product.podeComprar : true,
          loteDisponivel: product.loteDisponivel || null,
        };
      });

      return productsWithDetails;
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      throw error;
    }
  },
};

// Imagens de Produtos
export const productImageService = {
  async getAll(productId: number) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/images`, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar imagens");
    const data = await response.json();
    return data.data || [];
  },

  async create(productId: number, data: { path: string; name: string }) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/images`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Erro ao criar imagem");
    return await response.json();
  },

  async update(productId: number, imageId: number, data: { path?: string; name?: string; active?: boolean; displayOrder?: number; favorite?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/images/${imageId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Erro ao atualizar imagem");
    return await response.json();
  },

  async updateOrder(productId: number, updates: Array<{ id: number; displayOrder: number }>) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/images/update-order`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ updates }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar ordem");
    }
    return await response.json();
  },

  async delete(productId: number, imageId: number) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/images/${imageId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao desativar imagem");
    return await response.json();
  },
};

// Preços de Produtos
export const productPriceService = {
  async getAll(productId: number) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/prices`, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar preços");
    const data = await response.json();
    return data.data || [];
  },

  async create(productId: number, data: { value: number; batch: number; quantidadeCompra?: number }) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/prices`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Erro ao criar preço");
    return await response.json();
  },

  async update(productId: number, priceId: number, data: { value?: number; batch?: number; quantidadeCompra?: number; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/prices/${priceId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Erro ao atualizar preço");
    return await response.json();
  },

  async delete(productId: number, priceId: number) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/prices/${priceId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao desativar preço");
    return await response.json();
  },
};

// Variações de Produtos
export const productVariantService = {
  async getAll(productId: number) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/variants`, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar variações");
    const data = await response.json();
    return data.data || [];
  },

  async create(productId: number, data: { model: 'MASCULINO' | 'FEMININO' | 'UNISEX'; size: string; stock: number }) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/variants`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar variação");
    }
    return await response.json();
  },

  async update(productId: number, variantId: number, data: { model?: 'MASCULINO' | 'FEMININO' | 'UNISEX'; size?: string; stock?: number; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/variants/${variantId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar variação");
    }
    return await response.json();
  },

  async delete(productId: number, variantId: number) {
    const response = await fetch(`${getApiUrlValue()}/products/${productId}/variants/${variantId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao desativar variação");
    return await response.json();
  },
};

// Agency Points Imports
export const agencyPointsImportService = {
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/agency-points-imports`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar imports");
    const data = await response.json();
    return data.data || [];
  },

  async upload(file: File, referencePeriod: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('referencePeriod', referencePeriod);

    // Usar adminToken (mesmo padrão das outras rotas autenticadas)
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${getApiUrlValue()}/agency-points-imports/upload`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        // NÃO incluir Content-Type - o browser define automaticamente com boundary para FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao fazer upload da planilha');
    }

    return await response.json();
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/agency-points-imports/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar import");
    return await response.json();
  },

  async create(data: { referencePeriod: string; checksum: string; items: Array<{ cnpj: string; executiveName: string; points: number }> }) {
    const response = await fetch(`${getApiUrlValue()}/agency-points-imports`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar import");
    }
    return await response.json();
  },

  async delete(importId: number) {
    const response = await fetch(`${getApiUrlValue()}/agency-points-imports/${importId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir importação');
    }

    return await response.json();
  },

  async getStatus(importId: number) {
    const response = await fetch(`${getApiUrlValue()}/agency-points-imports/${importId}/status`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao buscar status da importação');
    }

    return await response.json();
  },

  async getLogs(importId: number, category?: string) {
    const params = new URLSearchParams();
    if (category) {
      params.append('category', category);
    }
    const queryString = params.toString();
    const url = `${getApiUrlValue()}/agency-points-imports/${importId}/logs${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao buscar logs da importação');
    }

    return await response.json();
  },
};

// Agencies
export const agencyService = {
  async getAll(filters?: { active?: boolean; cnpj?: string; name?: string }) {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) {
      params.append("active", filters.active.toString());
    }
    const queryString = params.toString();
    const url = `${getApiUrlValue()}/agencies${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar agências");
    const data = await response.json();
    return data.data || [];
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/agencies/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar agência");
    return await response.json();
  },

  async getBalance(id: number) {
    const response = await fetch(`${getApiUrlValue()}/agencies/${id}/balance`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar balance");
    return await response.json();
  },

  // Agency authenticated endpoints
  async getMe() {
    const response = await fetch(`${getApiUrlValue()}/agencies/me`, {
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar dados da agência");
    return await response.json();
  },

  async updateMe(data: { name?: string; phone?: string; address?: any }) {
    const response = await fetch(`${getApiUrlValue()}/agencies/me`, {
      method: "PUT",
      headers: getAgencyAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar dados");
    }
    return await response.json();
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await fetch(`${getApiUrlValue()}/agencies/me/change-password`, {
      method: "POST",
      headers: getAgencyAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao alterar senha");
    }
    return await response.json();
  },
};

// Agency Points Ledger
export const agencyPointsLedgerService = {
  async getByAgencyId(agencyId: number) {
    const response = await fetch(`${getApiUrlValue()}/agencies/${agencyId}/ledger`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar histórico");
    return await response.json();
  },
};

// Agency Registration (public endpoints)
export const agencyRegistrationService = {
  async validateCnpj(cnpj: string) {
    const response = await fetch(`${getApiUrlValue()}/agencies/validate-cnpj`, {
      method: "POST",
      headers: getPublicHeaders(),
      body: JSON.stringify({ cnpj }),
    });
    if (!response.ok) {
      if (response.status === 404) {
        return { eligible: false, alreadyExists: false };
      }
      if (response.status === 409) {
        const data = await response.json();
        return { eligible: false, alreadyExists: true, message: data.message };
      }
      throw new Error("Erro ao validar CNPJ");
    }
    return await response.json();
  },

  async register(data: {
    cnpj: string;
    name: string;
    email: string;
    phone: string;
    address: {
      cep: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
    };
    password: string;
    acceptedLegalDocuments?: number[];
  }) {
    const response = await fetch(`${getApiUrlValue()}/agencies/register`, {
      method: "POST",
      headers: getPublicHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao registrar agência");
    }
    return await response.json();
  },
};

// SMTP Configuration
export const smtpConfigService = {
  async getConfig() {
    const response = await fetch(`${getApiUrlValue()}/admin/smtp-config`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar configuração SMTP");
    return await response.json();
  },

  async setConfig(data: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string | null | undefined;
    from_email: string;
    from_name: string;
  }) {
    const response = await fetch(`${getApiUrlValue()}/admin/smtp-config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao salvar configuração SMTP");
    }
    return await response.json();
  },

  async testConfig(email?: string) {
    const response = await fetch(`${getApiUrlValue()}/admin/smtp-config/test`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw {
        message: data.message || "Erro ao testar configuração SMTP",
        error: data.error,
        code: data.code,
      };
    }
    return data;
  },
};

// Orders (Pedidos)
export const orderService = {
  // Criar pedido (checkout) - agência autenticada
  async create(agencyId: number, items: Array<{ productId: number; quantity: number }>) {
    const response = await fetch(`${getApiUrlValue()}/orders/agency/${agencyId}`, {
      method: "POST",
      headers: getPublicHeaders(),
      body: JSON.stringify({ items }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao finalizar pedido");
    }
    return await response.json();
  },

  // Buscar informações de compras de um produto por agência
  async getProductPurchaseCount(agencyId: number, productId: number) {
    const response = await fetch(`${getApiUrlValue()}/orders/agency/${agencyId}/product/${productId}/purchases`, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar informações de compras");
    }
    return await response.json();
  },

  // Buscar pedido por ID
  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/orders/${id}`, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar pedido");
    return await response.json();
  },

  // Buscar pedidos de uma agência
  async getByAgencyId(agencyId: number) {
    const response = await fetch(`${getApiUrlValue()}/orders/agency/${agencyId}`, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar pedidos");
    const data = await response.json();
    return data.data || [];
  },

  // Buscar meus pedidos (agência autenticada)
  async getMyOrders() {
    const response = await fetch(`${getApiUrlValue()}/agencies/me/orders`, {
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar meus pedidos");
    }
    const data = await response.json();
    return data.data || [];
  },

  // Buscar detalhes do meu pedido (agência autenticada)
  async getMyOrderById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/agencies/me/orders/${id}`, {
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 404) {
        throw new Error("Pedido não encontrado");
      }
      throw new Error(error.message || "Erro ao buscar pedido");
    }
    return await response.json();
  },

  // Listar todos os pedidos (admin)
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/orders`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar pedidos");
    const data = await response.json();
    return data.data || [];
  },

  // Buscar último pedido (para notificações)
  async getLatest() {
    const response = await fetch(`${getApiUrlValue()}/orders/latest`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      // Se for 400 (Invalid ID), pode ser que não há pedidos ainda
      if (response.status === 400) {
        return null;
      }
      throw new Error("Erro ao buscar último pedido");
    }
    const data = await response.json();
    return data.order || null;
  },
};

// Order Notification Emails
export const orderNotificationEmailService = {
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/admin/order-notification-emails`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar emails de notificação");
    const data = await response.json();
    return data.data || [];
  },

  async getActive() {
    const response = await fetch(`${getApiUrlValue()}/admin/order-notification-emails/active`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar emails ativos");
    const data = await response.json();
    return data.data || [];
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/order-notification-emails/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar email");
    return await response.json();
  },

  async create(email: string) {
    const response = await fetch(`${getApiUrlValue()}/admin/order-notification-emails`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar email de notificação");
    }
    return await response.json();
  },

  async update(id: number, data: { email?: string; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/admin/order-notification-emails/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar email");
    }
    return await response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/order-notification-emails/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao deletar email");
    }
    return await response.json();
  },
};

// Executives
export const executiveService = {
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/admin/executives`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar executivos");
    const data = await response.json();
    return data.data || [];
  },

  async getActive() {
    const response = await fetch(`${getApiUrlValue()}/admin/executives/active`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar executivos ativos");
    const data = await response.json();
    return data.data || [];
  },

  async getUniqueExecutiveNames() {
    const response = await fetch(`${getApiUrlValue()}/admin/executives/unique-names`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar nomes de executivos");
    const data = await response.json();
    return data.data || [];
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/executives/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar executivo");
    return await response.json();
  },

  async create(data: { code: string; email: string; name?: string; branchId?: number | null }) {
    const response = await fetch(`${getApiUrlValue()}/admin/executives`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar executivo");
    }
    return await response.json();
  },

  async update(id: number, data: { code?: string; email?: string; name?: string; branchId?: number | null; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/admin/executives/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar executivo");
    }
    return await response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/executives/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao deletar executivo");
    }
    return await response.json();
  },
};

// Hero Products (Produtos em Destaque)
export const heroProductService = {
  // Endpoint público para buscar produtos em destaque
  async getActiveForDisplay(agencyId?: number) {
    const url = agencyId 
      ? `${getApiUrlValue()}/hero-products/public?agencyId=${agencyId}`
      : `${getApiUrlValue()}/hero-products/public`;
    const response = await fetch(url, {
      headers: getPublicHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar produtos em destaque");
    return await response.json();
  },

  // Endpoints administrativos
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/hero-products`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar produtos em destaque");
    return await response.json();
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/hero-products/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar produto em destaque");
    return await response.json();
  },

  async uploadBannerImage(type: 'desktop' | 'mobile', file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${getApiUrlValue()}/hero-products/images/upload/${type}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao fazer upload da imagem");
    }
    return await response.json();
  },

  async create(data: { 
    bannerType: 'PRODUCT' | 'EXTERNAL';
    productId?: number;
    externalUrl?: string;
    imageDesktop: string;
    imageMobile: string;
    displayOrder?: number;
    active?: boolean;
  }) {
    const response = await fetch(`${getApiUrlValue()}/hero-products`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar banner");
    }
    return await response.json();
  },

  async update(id: number, data: { 
    bannerType?: 'PRODUCT' | 'EXTERNAL';
    productId?: number | null;
    externalUrl?: string | null;
    imageDesktop?: string;
    imageMobile?: string;
    displayOrder?: number;
    active?: boolean;
  }) {
    const response = await fetch(`${getApiUrlValue()}/hero-products/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar banner");
    }
    return await response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/hero-products/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao deletar produto em destaque");
    }
    return await response.json();
  },

  async updateOrder(updates: Array<{ id: number; displayOrder: number }>) {
    const response = await fetch(`${getApiUrlValue()}/hero-products/update-order`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ updates }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar ordem");
    }
    return await response.json();
  },
};

// Admin Users (Usuários Administrativos)
export const adminUserService = {
  async getAll(filters?: { name?: string; email?: string; role?: string; active?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.name) params.append("name", filters.name);
    if (filters?.email) params.append("email", filters.email);
    if (filters?.role) params.append("role", filters.role);
    if (filters?.active !== undefined) params.append("active", filters.active.toString());
    
    const queryString = params.toString();
    const url = `${getApiUrlValue()}/admin/users${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar usuários");
    }
    const data = await response.json();
    return data.data || [];
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/users/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar usuário");
    }
    return await response.json();
  },

  async create(data: { name: string; email: string; password: string; role: string }) {
    const response = await fetch(`${getApiUrlValue()}/admin/users`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar usuário");
    }
    return await response.json();
  },

  async update(id: number, data: { name?: string; role?: string }) {
    const response = await fetch(`${getApiUrlValue()}/admin/users/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar usuário");
    }
    return await response.json();
  },

  async updateStatus(id: number, active: boolean) {
    const response = await fetch(`${getApiUrlValue()}/admin/users/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ active }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar status do usuário");
    }
    return await response.json();
  },
};

// Tickets (Sistema de Suporte)
export const ticketService = {
  // Criar ticket (agência)
  async create(data: { subject: string; message: string }) {
    const response = await fetch(`${getApiUrlValue()}/tickets`, {
      method: "POST",
      headers: getAgencyAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar ticket");
    }
    return await response.json();
  },

  // Listar tickets da agência
  async getAgencyTickets() {
    const response = await fetch(`${getApiUrlValue()}/tickets/agency`, {
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar tickets");
    }
    return await response.json();
  },

  // Buscar ticket por ID (agência)
  async getAgencyTicket(id: number) {
    const response = await fetch(`${getApiUrlValue()}/tickets/agency/${id}`, {
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar ticket");
    }
    return await response.json();
  },

  // Buscar mensagens de um ticket (agência)
  async getAgencyTicketMessages(id: number) {
    const response = await fetch(`${getApiUrlValue()}/tickets/agency/${id}/messages`, {
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar mensagens");
    }
    return await response.json();
  },

  // Adicionar mensagem a um ticket (agência)
  async addAgencyMessage(ticketId: number, message: string) {
    const response = await fetch(`${getApiUrlValue()}/tickets/agency/${ticketId}/messages`, {
      method: "POST",
      headers: getAgencyAuthHeaders(),
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao adicionar mensagem");
    }
    return await response.json();
  },

  // ========== ADMIN METHODS ==========

  // Listar todos os tickets (admin)
  async getAll(filters?: { status?: string; agency_id?: number }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.agency_id) params.append("agency_id", filters.agency_id.toString());
    
    const queryString = params.toString();
    const url = `${getApiUrlValue()}/tickets/admin${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar tickets");
    }
    return await response.json();
  },

  // Buscar ticket por ID (admin)
  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/tickets/admin/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar ticket");
    }
    return await response.json();
  },

  // Buscar mensagens de um ticket (admin)
  async getTicketMessages(id: number) {
    const response = await fetch(`${getApiUrlValue()}/tickets/admin/${id}/messages`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar mensagens");
    }
    return await response.json();
  },

  // Adicionar mensagem a um ticket (admin)
  async addMessage(ticketId: number, message: string) {
    const response = await fetch(`${getApiUrlValue()}/tickets/admin/${ticketId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao adicionar mensagem");
    }
    return await response.json();
  },

  // Fechar ticket (admin)
  async closeTicket(ticketId: number) {
    const response = await fetch(`${getApiUrlValue()}/tickets/admin/${ticketId}/close`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao fechar ticket");
    }
    return await response.json();
  },
};

// Dashboard
export const dashboardService = {
  async getOrdersSummary() {
    const response = await fetch(`${getApiUrlValue()}/admin/dashboard/orders-summary`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar resumo de pedidos");
    }
    const data = await response.json();
    return data.data;
  },

  async getTopAgencyByPoints() {
    const response = await fetch(`${getApiUrlValue()}/admin/dashboard/top-agency-points`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar agência com mais pontos");
    }
    const data = await response.json();
    return data.data;
  },

  async getTopAgencyByOrders() {
    const response = await fetch(`${getApiUrlValue()}/admin/dashboard/top-agency-orders`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar agência com mais pedidos");
    }
    const data = await response.json();
    return data.data;
  },

  async getAgencyOrders(agencyId: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/dashboard/agency/${agencyId}/orders`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar pedidos da agência");
    }
    const data = await response.json();
    return data.data;
  },

  async getTopSuppliers() {
    const response = await fetch(`${getApiUrlValue()}/admin/dashboard/top-suppliers`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar top fornecedores");
    }
    const data = await response.json();
    return data.data;
  },

  async getProductsByBranch() {
    const response = await fetch(`${getApiUrlValue()}/admin/dashboard/products-by-branch`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar produtos por filial");
    }
    const data = await response.json();
    return data.data;
  },

  async getTopAgenciesWithoutOrders() {
    const response = await fetch(`${getApiUrlValue()}/admin/dashboard/agencies-without-orders`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar agências sem pedidos");
    }
    const data = await response.json();
    return data.data;
  },

  async getTopAgenciesNotRegistered() {
    const response = await fetch(`${getApiUrlValue()}/admin/dashboard/agencies-not-registered`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar agências não cadastradas");
    }
    const data = await response.json();
    return data.data;
  },
};

// Report Service
export const reportService = {
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/reports`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar relatórios");
    }
    const data = await response.json();
    return data.data;
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/reports/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar relatório");
    }
    const data = await response.json();
    return data.data;
  },

  async create(report: {
    name: string;
    sourceTable: string;
    visualizationType: string;
    config: any;
    isPublic?: boolean;
  }) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/reports`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(report),
    });
    if (!response.ok) {
      let errorMessage = "Erro ao criar relatório";
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // Se não conseguir fazer parse do JSON, usar o texto da resposta
        const text = await response.text();
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.data;
  },

  async update(id: number, report: {
    name?: string;
    sourceTable?: string;
    visualizationType?: string;
    config?: any;
    isPublic?: boolean;
  }) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/reports/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(report),
    });
    if (!response.ok) {
      let errorMessage = "Erro ao atualizar relatório";
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // Se não conseguir fazer parse do JSON, usar o texto da resposta
        const text = await response.text();
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.data;
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/reports/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao deletar relatório");
    }
    return await response.json();
  },

  async execute(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/reports/${id}/execute`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao executar relatório");
    }
    const data = await response.json();
    return data.data;
  },

  async preview(sourceTable: string, config: any) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/reports/preview`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ sourceTable, config }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao visualizar preview");
    }
    const data = await response.json();
    return data.data;
  },

  async getAvailableFields(table: string) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/reports/fields?table=${table}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar campos disponíveis");
    }
    const data = await response.json();
    return data.data;
  },
};

// Dashboard Widget Service
export const dashboardWidgetService = {
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/widgets`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar widgets");
    }
    const data = await response.json();
    return data.data;
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/widgets/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao buscar widget");
    }
    const data = await response.json();
    return data.data;
  },

  async create(widget: { reportId: number; position?: number; expanded?: number }) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/widgets`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(widget),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar widget");
    }
    const data = await response.json();
    return data.data;
  },

  async update(id: number, widget: { position?: number; expanded?: number; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/widgets/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(widget),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar widget");
    }
    const data = await response.json();
    return data.data;
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/reports/widgets/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      let errorMessage = "Erro ao deletar widget";
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch (e2) {
          // Ignore
        }
      }
      throw new Error(errorMessage);
    }
    
    try {
      const data = await response.json();
      
      // Validar que a resposta indica sucesso
      if (!data.success) {
        throw new Error(data.message || "Erro ao deletar widget");
      }
      
      console.log(`[dashboardWidgetService.delete] Widget ${id} deletado com sucesso`);
      return data;
    } catch (e) {
      // Se não conseguir fazer parse do JSON, assumir sucesso se status for 200
      if (response.status === 200 || response.status === 204) {
        console.log(`[dashboardWidgetService.delete] Widget ${id} deletado (resposta vazia)`);
        return { success: true };
      }
      throw e;
    }
  },
};

// Branches (Filiais)
export const branchService = {
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/admin/branches`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar filiais");
    const data = await response.json();
    return data.data || [];
  },

  async getUniqueBranchNames() {
    const response = await fetch(`${getApiUrlValue()}/admin/branches/unique-names`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar nomes de filiais");
    const data = await response.json();
    return data.data || [];
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/branches/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar filial");
    return await response.json();
  },

  async create(data: { name: string }) {
    const response = await fetch(`${getApiUrlValue()}/admin/branches`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar filial");
    }
    const result = await response.json();
    return { id: result.id };
  },

  async update(id: number, data: { name?: string }) {
    const response = await fetch(`${getApiUrlValue()}/admin/branches/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar filial");
    }
    return await response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/branches/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao deletar filial");
    }
    return await response.json();
  },
};

// Executive Notification Emails (Emails adicionais de notificação)
// Legal Documents Service
export const legalDocumentService = {
  async getAll() {
    const response = await fetch(`${getApiUrlValue()}/legal-documents`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao buscar documentos legais");
    }
    return await response.json();
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/agency/${id}`, {
      method: "GET",
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao buscar documento legal");
    }
    return await response.json();
  },

  async getByType(type: 'TERMS' | 'PRIVACY' | 'CAMPAIGN_RULES') {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/type/${type}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao buscar documentos legais");
    }
    return await response.json();
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao buscar documento legal");
    }
    return await response.json();
  },

  async create(data: { type: 'TERMS' | 'PRIVACY' | 'CAMPAIGN_RULES'; content: string; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/legal-documents`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar documento legal");
    }
    return await response.json();
  },

  async update(id: number, data: { content?: string; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar documento legal");
    }
    return await response.json();
  },

  async activate(id: number) {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/${id}/activate`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao ativar documento legal");
    }
    return await response.json();
  },

  // Public endpoints (for registration)
  async getActiveDocuments() {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/public/active`, {
      method: "GET",
      headers: getPublicHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao buscar documentos ativos");
    }
    return await response.json();
  },

  async getActiveByType(type: 'TERMS' | 'PRIVACY' | 'CAMPAIGN_RULES') {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/public/active/${type}`, {
      method: "GET",
      headers: getPublicHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao buscar documento ativo");
    }
    return await response.json();
  },

  async acceptDuringLogin(email: string, password: string, legalDocumentIds: number[]) {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/public/accept-during-login`, {
      method: "POST",
      headers: getPublicHeaders(),
      body: JSON.stringify({ email, password, legal_document_ids: legalDocumentIds }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao aceitar documentos");
    }
    return await response.json();
  },
};

// Agency legal document endpoints
export const agencyLegalDocumentService = {
  async getPending() {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/agency/pending`, {
      method: "GET",
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao buscar documentos pendentes");
    }
    return await response.json();
  },

  async getAccepted() {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/agency/accepted`, {
      method: "GET",
      headers: getAgencyAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao buscar documentos aceitos");
    }
    return await response.json();
  },

  async accept(legalDocumentId: number) {
    const response = await fetch(`${getApiUrlValue()}/legal-documents/agency/accept`, {
      method: "POST",
      headers: getAgencyAuthHeaders(),
      body: JSON.stringify({ legal_document_id: legalDocumentId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao aceitar documento");
    }
    return await response.json();
  },
};

export const executiveNotificationEmailService = {
  async getByExecutiveId(executiveId: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/executive-notification-emails/executive/${executiveId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar emails de notificação");
    const data = await response.json();
    return data.data || [];
  },

  async getById(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/executive-notification-emails/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Erro ao buscar email de notificação");
    return await response.json();
  },

  async create(data: { executiveId: number; email: string }) {
    const response = await fetch(`${getApiUrlValue()}/admin/executive-notification-emails`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar email de notificação");
    }
    return await response.json();
  },

  async update(id: number, data: { email?: string; active?: boolean }) {
    const response = await fetch(`${getApiUrlValue()}/admin/executive-notification-emails/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar email de notificação");
    }
    return await response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${getApiUrlValue()}/admin/executive-notification-emails/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao deletar email de notificação");
    }
    return await response.json();
  },
};
