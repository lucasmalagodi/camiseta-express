"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heroProductService = void 0;
const db_1 = require("../config/db");
exports.heroProductService = {
    async create(data) {
        // Validar regras de banner
        if (data.bannerType === 'PRODUCT') {
            if (!data.productId) {
                throw new Error('productId é obrigatório para banners do tipo PRODUCT');
            }
            if (data.externalUrl) {
                throw new Error('externalUrl não pode ser definido para banners do tipo PRODUCT');
            }
            // Verificar se o produto já está em destaque
            const existing = await (0, db_1.query)('SELECT id FROM hero_products WHERE product_id = ?', [data.productId]);
            if (Array.isArray(existing) && existing.length > 0) {
                throw new Error('Este produto já está em destaque');
            }
        }
        else if (data.bannerType === 'EXTERNAL') {
            if (!data.externalUrl) {
                throw new Error('externalUrl é obrigatório para banners do tipo EXTERNAL');
            }
            if (data.productId) {
                throw new Error('productId não pode ser definido para banners do tipo EXTERNAL');
            }
        }
        // Validar imagem desktop obrigatória apenas para EXTERNAL
        if (data.bannerType === 'EXTERNAL' && !data.imageDesktop) {
            throw new Error('imageDesktop é obrigatório para banners do tipo EXTERNAL');
        }
        // Buscar a maior ordem atual para definir a ordem padrão
        const maxOrderResult = await (0, db_1.query)('SELECT COALESCE(MAX(display_order), 0) as maxOrder FROM hero_products');
        const maxOrder = Array.isArray(maxOrderResult) && maxOrderResult.length > 0
            ? Number(maxOrderResult[0].maxOrder) || 0
            : 0;
        const displayOrder = data.displayOrder !== undefined ? data.displayOrder : maxOrder + 1;
        const displayDuration = data.displayDuration !== undefined ? data.displayDuration : 5; // Padrão 5 segundos
        const active = data.active !== undefined ? data.active : true;
        // Construir query dinamicamente baseado no tipo de banner
        let sql;
        let values;
        if (data.bannerType === 'PRODUCT') {
            // Para PRODUCT, product_id é obrigatório
            sql = 'INSERT INTO hero_products (banner_type, product_id, external_url, image_desktop, image_mobile, display_order, display_duration, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
            values = [data.bannerType, data.productId, null, data.imageDesktop || null, data.imageMobile || null, displayOrder, displayDuration, active];
        }
        else {
            // Para EXTERNAL, product_id deve ser NULL (ou não incluído)
            sql = 'INSERT INTO hero_products (banner_type, product_id, external_url, image_desktop, image_mobile, display_order, display_duration, active, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
            values = [data.bannerType, data.externalUrl, data.imageDesktop, data.imageMobile || null, displayOrder, displayDuration, active];
        }
        const result = await (0, db_1.query)(sql, values);
        return result.insertId;
    },
    async update(id, data) {
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
                const existing = await (0, db_1.query)('SELECT id FROM hero_products WHERE product_id = ? AND id != ?', [data.productId, id]);
                if (Array.isArray(existing) && existing.length > 0) {
                    throw new Error('Este produto já está em destaque');
                }
            }
        }
        else if (bannerType === 'EXTERNAL') {
            const externalUrl = data.externalUrl !== undefined ? data.externalUrl : current.externalUrl;
            if (!externalUrl) {
                throw new Error('externalUrl é obrigatório para banners do tipo EXTERNAL');
            }
            if (data.productId !== undefined && data.productId !== null) {
                throw new Error('productId não pode ser definido para banners do tipo EXTERNAL');
            }
        }
        const updates = [];
        const values = [];
        if (data.bannerType !== undefined) {
            updates.push('banner_type = ?');
            values.push(data.bannerType);
            // Quando mudar para EXTERNAL, garantir que product_id seja NULL
            if (data.bannerType === 'EXTERNAL') {
                updates.push('product_id = NULL');
            }
            // Quando mudar para PRODUCT, garantir que external_url seja NULL
            if (data.bannerType === 'PRODUCT') {
                updates.push('external_url = NULL');
            }
        }
        else {
            // Se não está mudando o tipo, garantir consistência baseado no tipo atual
            if (bannerType === 'EXTERNAL' && data.productId === undefined) {
                // Se for EXTERNAL e não está atualizando productId, garantir que seja NULL
                updates.push('product_id = NULL');
            }
            if (bannerType === 'PRODUCT' && data.externalUrl === undefined) {
                // Se for PRODUCT e não está atualizando externalUrl, garantir que seja NULL
                updates.push('external_url = NULL');
            }
        }
        if (data.productId !== undefined) {
            if (bannerType === 'EXTERNAL') {
                // Para EXTERNAL, product_id deve ser NULL
                updates.push('product_id = NULL');
            }
            else {
                updates.push('product_id = ?');
                values.push(data.productId);
            }
        }
        if (data.externalUrl !== undefined) {
            if (bannerType === 'PRODUCT') {
                // Para PRODUCT, external_url deve ser NULL
                updates.push('external_url = NULL');
            }
            else {
                updates.push('external_url = ?');
                values.push(data.externalUrl);
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
        await (0, db_1.query)(sql, values);
    },
    async delete(id) {
        await (0, db_1.query)('DELETE FROM hero_products WHERE id = ?', [id]);
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, banner_type as bannerType, product_id as productId, external_url as externalUrl, image_desktop as imageDesktop, image_mobile as imageMobile, display_order as displayOrder, display_duration as displayDuration, active, created_at as createdAt, updated_at as updatedAt FROM hero_products WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findAll() {
        const results = await (0, db_1.query)('SELECT id, banner_type as bannerType, product_id as productId, external_url as externalUrl, image_desktop as imageDesktop, image_mobile as imageMobile, display_order as displayOrder, display_duration as displayDuration, active, created_at as createdAt, updated_at as updatedAt FROM hero_products ORDER BY display_order ASC, created_at ASC');
        return Array.isArray(results) ? results : [];
    },
    async updateOrder(updates) {
        // Importar pool para usar transação
        const { pool } = require('../config/db');
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            // Para cada atualização
            for (const update of updates) {
                await connection.execute('UPDATE hero_products SET display_order = ?, updated_at = NOW() WHERE id = ?', [update.displayOrder, update.id]);
            }
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    // Buscar banners ativos para exibição pública (respeitando regras de lotes para PRODUCT)
    async findActiveForDisplay(agencyId) {
        // Buscar todos os banners ativos, ordenados por display_order
        const heroProducts = await (0, db_1.query)(`SELECT 
                hp.id as heroId,
                hp.banner_type as bannerType,
                hp.product_id as productId,
                hp.external_url as externalUrl,
                hp.image_desktop as imageDesktop,
                hp.image_mobile as imageMobile,
                hp.display_order as displayOrder,
                hp.display_duration as displayDuration
            FROM hero_products hp
            WHERE hp.active = true
            ORDER BY hp.display_order ASC`);
        if (!Array.isArray(heroProducts) || heroProducts.length === 0) {
            return [];
        }
        // Separar banners PRODUCT e EXTERNAL
        const productBanners = heroProducts.filter((hp) => hp.bannerType === 'PRODUCT' && hp.productId);
        const externalBanners = heroProducts.filter((hp) => hp.bannerType === 'EXTERNAL');
        const result = [];
        // Processar banners EXTERNAL (mais simples)
        for (const banner of externalBanners) {
            if (!banner.imageDesktop) {
                continue; // Pular banners sem imagem desktop
            }
            result.push({
                id: banner.heroId,
                nome: 'Banner',
                descricao: '',
                imagem: banner.imageDesktop,
                imagem_mobile: banner.imageMobile || banner.imageDesktop, // Usar desktop como fallback
                preco: 0,
                displayDuration: banner.displayDuration || 5,
                link: {
                    type: 'EXTERNAL',
                    url: banner.externalUrl || ''
                }
            });
        }
        // Processar banners PRODUCT (com lógica de lotes)
        if (productBanners.length > 0) {
            const productIds = productBanners.map((hp) => hp.productId);
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
            const products = await (0, db_1.query)(productsSql, productIds);
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
            const allImages = await (0, db_1.query)(imagesSql, productIds);
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
            const allPrices = await (0, db_1.query)(pricesSql, productIds);
            // Buscar contagem de compras por agência (se agencyId fornecido)
            let purchaseCountsByProduct = {};
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
                const purchaseCounts = await (0, db_1.query)(purchaseCountsSql, [...productIds, agencyId]);
                purchaseCounts.forEach((row) => {
                    purchaseCountsByProduct[row.productId] = Number(row.total) || 0;
                });
            }
            // Agrupar imagens e preços por produto
            const imagesByProduct = {};
            const pricesByProduct = {};
            allImages.forEach((img) => {
                if (!imagesByProduct[img.productId]) {
                    imagesByProduct[img.productId] = [];
                }
                imagesByProduct[img.productId].push(img);
            });
            allPrices.forEach((price) => {
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
                const sortedPrices = prices.sort((a, b) => a.batch - b.batch);
                // Buscar quantidade de compras da agência
                const agencyPurchaseCount = agencyId ? (purchaseCountsByProduct[product.id] || 0) : 0;
                // Determinar qual lote usar baseado na lógica de lotes
                let loteDisponivel = null;
                let podeComprar = false;
                if (sortedPrices.length > 0) {
                    for (let i = 0; i < sortedPrices.length; i++) {
                        const lote = sortedPrices[i];
                        const quantidadeCompra = Number(lote.quantidadeCompra) || 0;
                        if (quantidadeCompra === 0) {
                            loteDisponivel = lote;
                            podeComprar = true;
                            break;
                        }
                        if (agencyPurchaseCount >= quantidadeCompra) {
                            continue;
                        }
                        else {
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
        return result.sort((a, b) => {
            const aOrder = heroProducts.find((hp) => (hp.bannerType === 'PRODUCT' && a.link?.product_id === hp.productId) ||
                (hp.bannerType === 'EXTERNAL' && a.link?.url === hp.externalUrl))?.displayOrder || 0;
            const bOrder = heroProducts.find((hp) => (hp.bannerType === 'PRODUCT' && b.link?.product_id === hp.productId) ||
                (hp.bannerType === 'EXTERNAL' && b.link?.url === hp.externalUrl))?.displayOrder || 0;
            return aOrder - bOrder;
        });
    }
};
