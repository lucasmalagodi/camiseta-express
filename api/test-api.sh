#!/bin/bash

# Script de validação rápida da API
# Uso: ./test-api.sh [porta]
# Exemplo: ./test-api.sh 5001

PORT=${1:-5001}
BASE_URL="http://localhost:${PORT}"

echo "🚀 Testando API na porta ${PORT}..."
echo ""

# Health Check
echo "1️⃣  Testando Health Check..."
curl -s "${BASE_URL}/health" | jq '.' || echo "❌ Erro no health check"
echo ""

# Criar Categoria
echo "2️⃣  Criando categoria..."
CATEGORY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/categories" \
  -H "Content-Type: application/json" \
  -d '{"name": "Camisetas"}')
echo $CATEGORY_RESPONSE | jq '.'
CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.id')
echo "✅ Categoria criada com ID: ${CATEGORY_ID}"
echo ""

# Listar Categorias
echo "3️⃣  Listando categorias..."
curl -s "${BASE_URL}/api/categories" | jq '.'
echo ""

# Criar Produto
echo "4️⃣  Criando produto..."
PRODUCT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/products" \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": ${CATEGORY_ID},
    \"name\": \"Camiseta Azul\",
    \"description\": \"Camiseta azul de algodão\"
  }")
echo $PRODUCT_RESPONSE | jq '.'
PRODUCT_ID=$(echo $PRODUCT_RESPONSE | jq -r '.id')
echo "✅ Produto criado com ID: ${PRODUCT_ID}"
echo ""

# Buscar Produto por ID
echo "5️⃣  Buscando produto por ID..."
curl -s "${BASE_URL}/api/products/${PRODUCT_ID}" | jq '.'
echo ""

# Listar Produtos
echo "6️⃣  Listando produtos..."
curl -s "${BASE_URL}/api/products" | jq '.'
echo ""

# Filtrar produtos por categoria
echo "7️⃣  Filtrando produtos por categoria..."
curl -s "${BASE_URL}/api/products?categoryId=${CATEGORY_ID}" | jq '.'
echo ""

# Adicionar Imagem
echo "8️⃣  Adicionando imagem ao produto..."
IMAGE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/products/${PRODUCT_ID}/images" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/images/camiseta-azul.jpg",
    "name": "Camiseta Azul - Frente"
  }')
echo $IMAGE_RESPONSE | jq '.'
echo ""

# Listar Imagens
echo "9️⃣  Listando imagens do produto..."
curl -s "${BASE_URL}/api/products/${PRODUCT_ID}/images" | jq '.'
echo ""

# Adicionar Preço
echo "🔟 Adicionando preço ao produto..."
PRICE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/products/${PRODUCT_ID}/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "value": 49.90,
    "batch": 10
  }')
echo $PRICE_RESPONSE | jq '.'
echo ""

# Listar Preços
echo "1️⃣1️⃣  Listando preços do produto..."
curl -s "${BASE_URL}/api/products/${PRODUCT_ID}/prices" | jq '.'
echo ""

echo "✅ Testes concluídos!"
echo ""
echo "💡 Dica: Use 'jq' para melhor formatação JSON"
echo "   Instalar: brew install jq (macOS) ou apt-get install jq (Linux)"
