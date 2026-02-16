import { query } from '../config/db';

export interface HeroProduct {
    id: number;
    productId: number | null;
    bannerType: 'PRODUCT' | 'EXTERNAL';
    imageDesktop: string | null;
    imageMobile: string | null;
    externalUrl: string | null;
    linkType: 'EXTERNAL_URL' | 'PRODUCTS_PAGE' | 'NONE' | null;
    displayOrder: number;
    displayDuration: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateHeroProductDto {
    bannerType: 'PRODUCT' | 'EXTERNAL';
    productId?: number;
    externalUrl?: string | null;
    linkType?: 'EXTERNAL_URL' | 'PRODUCTS_PAGE' | 'NONE' | null;
    imageDesktop?: string;
    imageMobile?: string;
    displayOrder?: number;
    displayDuration?: number;
    active?: boolean;
}

export interface UpdateHeroProductDto {
    bannerType?: 'PRODUCT' | 'EXTERNAL';
    productId?: number | null;
    externalUrl?: string | null;
    linkType?: 'EXTERNAL_URL' | 'PRODUCTS_PAGE' | 'NONE' | null;
    imageDesktop?: string;
    imageMobile?: string;
    displayOrder?: number;
    displayDuration?: number;
    active?: boolean;
}

export const heroProductService = {
    async create(data: CreateHeroProductDto): Promise<number> {
        // Validar regras de banner
        if (data.bannerType === 'PRODUCT') {
            if (!data.productId) {
                throw new Error('productId é obrigatório para banners do tipo PRODUCT');
            }
            if (data.externalUrl) {
                throw new Error('externalUrl não pode ser definido para banners do tipo PRODUCT');
            }
            
            // Verificar se o produto já está em destaque
            const existing = await query(
                'SELECT id FROM hero_products WHERE product_id = ?',
                [data.productId]
            ) as any[];

            if (Array.isArray(existing) && existing.length > 0) {
                throw new Error('Este produto já está em destaque');
            }
        } else if (data.bannerType === 'EXTERNAL') {
            if (data.productId) {
                throw new Error('productId não pode ser definido para banners do tipo EXTERNAL');
            }
            
            // Validar linkType e externalUrl
            const linkType = data.linkType || 'NONE';
            if (linkType === 'EXTERNAL_URL' && !data.externalUrl) {
                throw new Error('externalUrl é obrigatório quando linkType é EXTERNAL_URL');
            }
        }

        // Validar imagem desktop obrigatória apenas para EXTERNAL
        if (data.bannerType === 'EXTERNAL' && !data.imageDesktop) {
            throw new Error('imageDesktop é obrigatório para banners do tipo EXTERNAL');
        }

        // Buscar a maior ordem atual para definir a ordem padrão
        const maxOrderResult = await query(
            'SELECT COALESCE(MAX(display_order), 0) as maxOrder FROM hero_products'
        ) as any[];

        const maxOrder = Array.isArray(maxOrderResult) && maxOrderResult.length > 0
            ? Number(maxOrderResult[0].maxOrder) || 0
            : 0;

        const displayOrder = data.displayOrder !== undefined ? data.displayOrder : maxOrder + 1;
        const displayDuration = data.displayDuration !== undefined ? data.displayDuration : 5; // Padrão 5 segundos
        const active = data.active !== undefined ? data.active : true;

        // Construir query dinamicamente baseado no tipo de banner
        let sql: string;
        let values: any[];

        if (data.bannerType === 'PRODUCT') {
            // Para PRODUCT, product_id é obrigatório
            sql = 'INSERT INTO hero_products (banner_type, product_id, external_url, link_type, image_desktop, image_mobile, display_order, display_duration, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
            values = [data.bannerType, data.productId, null, null, data.imageDesktop || null, data.imageMobile || null, displayOrder, displayDuration, active];
        } else {
            // Para EXTERNAL, product_id deve ser NULL
            const linkType = data.linkType || 'NONE';
            sql = 'INSERT INTO hero_products (banner_type, product_id, external_url, link_type, image_desktop, image_mobile, display_order, display_duration, active, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
            values = [data.bannerType, data.externalUrl || null, linkType, data.imageDesktop, data.imageMobile || null, displayOrder, displayDuration, active];
        }

        const result = await query(sql, values) as any;

        return result.insertId;
    },

    async update(id: number, data: UpdateHeroProductDto): Promise<void> {
        // Buscar banner atual para validar mudanças
        const current = await this.findById(id);
        if (!current) {
            throw new Error('Banner não encontrado');
        }

        const bannerType = data.bannerType !== undefined ? data.bannerType : current.bannerType;

        // Validar regras de banner
        if (bannerType === 'PRODUCT') {
            const productId = data.productId !== undefined ? data.productId : current.productId;
            if (!productId) {
                throw new Error('productId é obrigatório para banners do tipo PRODUCT');
            }
            if (data.externalUrl !== undefined && data.externalUrl !== null) {
                throw new Error('externalUrl não pode ser definido para banners do tipo PRODUCT');
            }
            
            // Verificar se outro banner já usa este productId
            if (data.productId !== undefined && data.productId !== current.productId) {
                const existing = await query(
                    'SELECT id FROM hero_products WHERE product_id = ? AND id != ?',
                    [data.productId, id]
                ) as any[];

                if (Array.isArray(existing) && existing.length > 0) {
                    throw new Error('Este produto já está em destaque');
                }
            }
        } else if (bannerType === 'EXTERNAL') {
            if (data.productId !== undefined && data.productId !== null) {
                throw new Error('productId não pode ser definido para banners do tipo EXTERNAL');
            }
            
            // Validar linkType e externalUrl
            const linkType = data.linkType !== undefined ? data.linkType : ((current as any).linkType || 'NONE');
            const externalUrl = data.externalUrl !== undefined ? data.externalUrl : current.externalUrl;
            
            if (linkType === 'EXTERNAL_URL' && !externalUrl) {
                throw new Error('externalUrl é obrigatório quando linkType é EXTERNAL_URL');
            }
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (data.bannerType !== undefined) {
            updates.push('banner_type = ?');
            values.push(data.bannerType);
            
            // Quando mudar para EXTERNAL, garantir que product_id seja NULL
            if (data.bannerType === 'EXTERNAL') {
                updates.push('product_id = NULL');
            }
            // Quando mudar para PRODUCT, garantir que external_url e link_type sejam NULL
            if (data.bannerType === 'PRODUCT') {
                updates.push('external_url = NULL');
                updates.push('link_type = NULL');
            }
        } else {
            // Se não está mudando o tipo, garantir consistência baseado no tipo atual
            if (bannerType === 'EXTERNAL' && data.productId === undefined) {
                // Se for EXTERNAL e não está atualizando productId, garantir que seja NULL
                updates.push('product_id = NULL');
            }
            if (bannerType === 'PRODUCT' && data.externalUrl === undefined) {
                // Se for PRODUCT e não está atualizando externalUrl, garantir que seja NULL
                updates.push('external_url = NULL');
            }
            if (bannerType === 'PRODUCT' && data.linkType === undefined) {
                // Se for PRODUCT e não está atualizando linkType, garantir que seja NULL
                updates.push('link_type = NULL');
            }
        }

        if (data.productId !== undefined) {
            if (bannerType === 'EXTERNAL') {
                // Para EXTERNAL, product_id deve ser NULL
                updates.push('product_id = NULL');
            } else {
                updates.push('product_id = ?');
                values.push(data.productId);
            }
        }

        if (data.externalUrl !== undefined) {
            if (bannerType === 'PRODUCT') {
                // Para PRODUCT, external_url deve ser NULL
                updates.push('external_url = NULL');
            } else {
                updates.push('external_url = ?');
                values.push(data.externalUrl);
            }
        }

        if (data.linkType !== undefined) {
            if (bannerType === 'PRODUCT') {
                // Para PRODUCT, link_type deve ser NULL
                updates.push('link_type = NULL');
            } else {
                updates.push('link_type = ?');
                values.push(data.linkType);
            }
        }

        if (data.imageDesktop !== undefined) {
            updates.push('image_desktop = ?');
            values.push(data.imageDesktop);
        }

        if (data.imageMobile !== undefined) {
            updates.push('image_mobile = ?');
            values.push(data.imageMobile);
        }

        if (data.displayOrder !== undefined) {
            updates.push('display_order = ?');
            values.push(data.displayOrder);
        }

        if (data.displayDuration !== undefined) {
            updates.push('display_duration = ?');
            values.push(data.displayDuration);
        }

        if (data.active !== undefined) {
            updates.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (updates.length === 0) {
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(id);

        const sql = `UPDATE hero_products SET ${updates.join(', ')} WHERE id = ?`;
        await query(sql, values);
    },

    async delete(id: number): Promise<void> {
        await query('DELETE FROM hero_products WHERE id = ?', [id]);
    },

    async findById(id: number): Promise<HeroProduct | null> {
        const results = await query(
            'SELECT id, banner_type as bannerType, product_id as productId, external_url as externalUrl, link_type as linkType, image_desktop as imageDesktop, image_mobile as imageMobile, display_order as displayOrder, display_duration as displayDuration, active, created_at as createdAt, updated_at as updatedAt FROM hero_products WHERE id = ?',
            [id]
        ) as HeroProduct[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findAll(): Promise<HeroProduct[]> {
        const results = await query(
            'SELECT id, banner_type as bannerType, product_id as productId, external_url as externalUrl, link_type as linkType, image_desktop as imageDesktop, image_mobile as imageMobile, display_order as displayOrder, display_duration as displayDuration, active, created_at as createdAt, updated_at as updatedAt FROM hero_products ORDER BY display_order ASC, created_at ASC'
        ) as HeroProduct[];

        return Array.isArray(results) ? results : [];
    },

    async updateOrder(updates: Array<{ id: number; displayOrder: number }>): Promise<void> {
        // Importar pool para usar transação
        const { pool } = require('../config/db');
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Para cada atualização
            for (const update of updates) {
                await connection.execute(
                    'UPDATE hero_products SET display_order = ?, updated_at = NOW() WHERE id = ?',
                    [update.displayOrder, update.id]
                );
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Buscar banners ativos para exibição pública (respeitando regras de lotes para PRODUCT)
    async findActiveForDisplay(agencyId?: number): Promise<any[]> {
        // Buscar todos os banners ativos, ordenados por display_order
        const heroProducts = await query(
            `SELECT 
                hp.id as heroId,
                hp.banner_type as bannerType,
                hp.product_id as productId,
                hp.external_url as externalUrl,
                hp.link_type as linkType,
                hp.image_desktop as imageDesktop,
                hp.image_mobile as imageMobile,
                hp.display_order as displayOrder,
                hp.display_duration as displayDuration
            FROM hero_products hp
            WHERE hp.active = true
            ORDER BY hp.display_order ASC`
        ) as any[];

        if (!Array.isArray(heroProducts) || heroProducts.length === 0) {
            return [];
        }

        // Separar banners PRODUCT e EXTERNAL
        const productBanners = heroProducts.filter((hp: any) => hp.bannerType === 'PRODUCT' && hp.productId);
        const externalBanners = heroProducts.filter((hp: any) => hp.bannerType === 'EXTERNAL');

        const result: any[] = [];

        // Processar banners EXTERNAL
        for (const banner of externalBanners) {
            if (!banner.imageDesktop) {
                continue; // Pular banners sem imagem desktop
            }

            const linkType = banner.linkType || 'NONE';
            let link: any = null;

            if (linkType === 'EXTERNAL_URL' && banner.externalUrl) {
                link = {
                    type: 'EXTERNAL',
                    url: banner.externalUrl
                };
            } else if (linkType === 'PRODUCTS_PAGE') {
                link = {
                    type: 'PRODUCTS_PAGE'
                };
            }
            // Se linkType for 'NONE', link permanece null

            result.push({
                id: banner.heroId,
                nome: 'Banner',
                descricao: '',
                imagem: banner.imageDesktop,
                imagem_mobile: banner.imageMobile || banner.imageDesktop, // Usar desktop como fallback
                preco: 0,
                displayDuration: banner.displayDuration || 5,
                link: link
            });
        }

        // Processar banners PRODUCT (com lógica de lotes)
        if (productBanners.length > 0) {
            const productIds = productBanners.map((hp: any) => hp.productId);
            const placeholders = productIds.map(() => '?').join(',');

            // Buscar detalhes dos produtos
            const productsSql = `
                SELECT 
                    id, 
                    category_id as categoryId, 
                    name, 
                    description, 
                    quantity, 
                    active, 
                    created_at as createdAt, 
                    updated_at as updatedAt 
                FROM products 
                WHERE id IN (${placeholders}) AND active = true
            `;
            const products = await query(productsSql, productIds) as any[];

            // Buscar imagens (priorizar favorita, depois por ordem)
            const imagesSql = `
                SELECT 
                    id, 
                    product_id as productId, 
                    path, 
                    name, 
                    active, 
                    display_order as displayOrder,
                    favorite,
                    created_at as createdAt, 
                    updated_at as updatedAt 
                FROM product_images 
                WHERE product_id IN (${placeholders}) AND active = true 
                ORDER BY favorite DESC, display_order ASC, created_at ASC
            `;
            const allImages = await query(imagesSql, productIds) as any[];

            // Buscar preços
            const pricesSql = `
                SELECT 
                    id, 
                    product_id as productId, 
                    value, 
                    batch, 
                    quantidade_compra as quantidadeCompra, 
                    active, 
                    created_at as createdAt, 
                    updated_at as updatedAt 
                FROM product_prices 
                WHERE product_id IN (${placeholders}) AND active = true 
                ORDER BY batch ASC
            `;
            const allPrices = await query(pricesSql, productIds) as any[];

            // Buscar contagem de compras por agência (se agencyId fornecido)
            let purchaseCountsByProduct: Record<number, number> = {};
            if (agencyId && productIds.length > 0) {
                const purchaseCountsSql = `
                    SELECT 
                        oi.product_id as productId,
                        COALESCE(SUM(oi.quantity), 0) as total
                    FROM order_items oi 
                    INNER JOIN orders o ON oi.order_id = o.id 
                    WHERE oi.product_id IN (${placeholders}) AND o.agency_id = ? AND o.status = 'CONFIRMED'
                    GROUP BY oi.product_id
                `;
                const purchaseCounts = await query(purchaseCountsSql, [...productIds, agencyId]) as any[];
                
                purchaseCounts.forEach((row: any) => {
                    purchaseCountsByProduct[row.productId] = Number(row.total) || 0;
                });
            }

            // Agrupar imagens e preços por produto
            const imagesByProduct: Record<number, any[]> = {};
            const pricesByProduct: Record<number, any[]> = {};

            allImages.forEach((img: any) => {
                if (!imagesByProduct[img.productId]) {
                    imagesByProduct[img.productId] = [];
                }
                imagesByProduct[img.productId].push(img);
            });

            allPrices.forEach((price: any) => {
                if (!pricesByProduct[price.productId]) {
                    pricesByProduct[price.productId] = [];
                }
                pricesByProduct[price.productId].push(price);
            });

            // Processar cada banner PRODUCT
            for (const banner of productBanners) {
                const product = Array.isArray(products) 
                    ? products.find(p => p.id === banner.productId)
                    : null;

                if (!product) {
                    continue;
                }

                const images = imagesByProduct[product.id] || [];
                const prices = pricesByProduct[product.id] || [];
                
                // Ordenar preços por batch
                const sortedPrices = prices.sort((a: any, b: any) => a.batch - b.batch);
                
                // Buscar quantidade de compras da agência
                const agencyPurchaseCount = agencyId ? (purchaseCountsByProduct[product.id] || 0) : 0;
                
                // Determinar qual lote usar baseado na lógica de lotes
                let loteDisponivel: any = null;
                let podeComprar = false;
                
                if (sortedPrices.length > 0) {
                    for (let i = 0; i < sortedPrices.length; i++) {
                        const lote = sortedPrices[i];
                        const quantidadeCompra = Number(lote.quantidadeCompra) || 0;
                        
                        // Se quantidade_compra for 0, permite apenas 1 unidade por agência (qualquer lote)
                        if (quantidadeCompra === 0) {
                            // Se a agência ainda não comprou nenhuma unidade, pode comprar
                            if (agencyPurchaseCount === 0) {
                                loteDisponivel = lote;
                                podeComprar = true;
                                break;
                            }
                            // Se já comprou, não pode mais comprar neste lote com quantidadeCompra = 0
                            continue;
                        }
                        
                        if (agencyPurchaseCount >= quantidadeCompra) {
                            continue;
                        } else {
                            loteDisponivel = lote;
                            podeComprar = true;
                            break;
                        }
                    }
                    
                    if (!loteDisponivel) {
                        podeComprar = false;
                    }
                }

                // Se não pode comprar, não incluir no resultado
                if (!podeComprar) {
                    continue;
                }

                // Usar imagem do banner se disponível, senão usar imagem do produto
                const imagemDesktop = banner.imageDesktop || (images.length > 0 ? images[0].path : '');
                const imagemMobile = banner.imageMobile || imagemDesktop; // Usar desktop como fallback se mobile não existir

                // Calcular preço (usar o lote disponível)
                const preco = loteDisponivel ? Number(loteDisponivel.value) : 0;

                // Formatar no formato normalizado
                result.push({
                    id: product.id,
                    nome: product.name,
                    descricao: product.description || '',
                    imagem: imagemDesktop,
                    imagem_mobile: imagemMobile,
                    preco: preco,
                    displayDuration: banner.displayDuration || 5,
                    link: {
                        type: 'PRODUCT',
                        product_id: product.id
                    }
                });
            }
        }

        // Ordenar resultado final por display_order
        // Para banners EXTERNAL, usar heroId para identificar (já que podem não ter URL)
        return result.sort((a, b) => {
            const aOrder = heroProducts.find((hp: any) => {
                if (hp.bannerType === 'PRODUCT' && a.link?.product_id === hp.productId) {
                    return true;
                }
                if (hp.bannerType === 'EXTERNAL') {
                    // Para banners externos, verificar por heroId ou URL
                    if (a.id === hp.heroId) return true;
                    if (a.link?.url && a.link.url === hp.externalUrl) return true;
                }
                return false;
            })?.displayOrder || 0;
            
            const bOrder = heroProducts.find((hp: any) => {
                if (hp.bannerType === 'PRODUCT' && b.link?.product_id === hp.productId) {
                    return true;
                }
                if (hp.bannerType === 'EXTERNAL') {
                    // Para banners externos, verificar por heroId ou URL
                    if (b.id === hp.heroId) return true;
                    if (b.link?.url && b.link.url === hp.externalUrl) return true;
                }
                return false;
            })?.displayOrder || 0;
            
            return aOrder - bOrder;
        });
    }
};
