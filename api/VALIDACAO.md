# Guia de Validação da API

## 1. Preparação do Ambiente

### Opção A: Usando Docker (Recomendado)

1. **Certifique-se de ter um arquivo `.env` na pasta `fts/`** com as variáveis:
```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=ftsancd
MYSQL_USER=ftsuser
MYSQL_PASSWORD=ftspassword
JWT_SECRET=seu_jwt_secret_aqui
```

2. **Suba os containers:**
```bash
cd /Users/lucasmalagodi/projetos/ancdcampanha
docker-compose up -d
```

3. **Aguarde o MySQL inicializar** (pode levar alguns segundos)

4. **Verifique se os containers estão rodando:**
```bash
docker-compose ps
```

### Opção B: Localmente (sem Docker)

1. **Instale as dependências:**
```bash
cd /Users/lucasmalagodi/projetos/ancdcampanha/fts/api
npm install
```

2. **Configure o arquivo `.env`** na pasta `fts/` (raiz do projeto frontend):
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=ftsancd
JWT_SECRET=seu_jwt_secret_aqui
JWT_EXPIRE=30d
```

3. **Certifique-se de que o MySQL está rodando** e que o banco `ftsancd` existe

4. **Execute as migrations** (criar tabelas):
```bash
# Conecte-se ao MySQL e execute o arquivo:
# mysql/init/02-products-tables.sql
```

## 2. Subir o Servidor

### Com Docker:
O servidor já está rodando automaticamente na porta **5001** (mapeada da 5000 do container)

### Localmente:
```bash
cd /Users/lucasmalagodi/projetos/ancdcampanha/fts/api
npm run dev
```

O servidor estará disponível em: `http://localhost:5000` (ou 5001 se usar Docker)

## 3. Validar os Endpoints

### 3.1. Health Check
```bash
curl http://localhost:5001/health
```
**Resposta esperada:**
```json
{"status":"success","message":"API is running"}
```

### 3.2. Criar uma Categoria
```bash
curl -X POST http://localhost:5001/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Camisetas"}'
```
**Resposta esperada:**
```json
{"success":true,"id":1}
```

### 3.3. Listar Categorias
```bash
curl http://localhost:5001/api/categories
```
**Resposta esperada:**
```json
{"data":[{"id":1,"name":"Camisetas","active":true,"createdAt":"...","updatedAt":"..."}],"total":1}
```

### 3.4. Criar um Produto
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 1,
    "name": "Camiseta Azul",
    "description": "Camiseta azul de algodão"
  }'
```
**Resposta esperada:**
```json
{"success":true,"id":1}
```

### 3.5. Listar Produtos (com filtros)
```bash
# Todos os produtos
curl http://localhost:5001/api/products

# Filtrar por categoria
curl "http://localhost:5001/api/products?categoryId=1"

# Filtrar por nome (busca parcial)
curl "http://localhost:5001/api/products?name=Azul"

# Filtrar por ativo
curl "http://localhost:5001/api/products?active=true"
```

### 3.6. Buscar Produto por ID
```bash
curl http://localhost:5001/api/products/1
```
**Resposta esperada:**
```json
{
  "id": 1,
  "categoryId": 1,
  "name": "Camiseta Azul",
  "description": "Camiseta azul de algodão",
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 3.7. Adicionar Imagem ao Produto
```bash
curl -X POST http://localhost:5001/api/products/1/images \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/images/camiseta-azul.jpg",
    "name": "Camiseta Azul - Frente"
  }'
```

### 3.8. Listar Imagens do Produto
```bash
curl http://localhost:5001/api/products/1/images
```

### 3.9. Adicionar Preço ao Produto
```bash
curl -X POST http://localhost:5001/api/products/1/prices \
  -H "Content-Type: application/json" \
  -d '{
    "value": 49.90,
    "batch": 10
  }'
```

### 3.10. Listar Preços do Produto
```bash
curl http://localhost:5001/api/products/1/prices
```

### 3.11. Atualizar Produto
```bash
curl -X PUT http://localhost:5001/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Camiseta Azul Premium",
    "description": "Camiseta azul de algodão premium"
  }'
```

### 3.12. Soft Delete (desativar)
```bash
curl -X DELETE http://localhost:5001/api/products/1
```
**Resposta esperada:**
```json
{"success":true,"id":1}
```

Após o delete, o produto não aparecerá em listagens se você filtrar por `active=true`, mas ainda existirá no banco.

## 4. Testes com Postman/Insomnia

Você pode importar estas requisições em ferramentas como Postman ou Insomnia:

**Base URL:** `http://localhost:5001`

**Endpoints principais:**
- `GET /health`
- `POST /api/categories`
- `GET /api/categories`
- `GET /api/categories/:id`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `POST /api/products`
- `GET /api/products` (com query params: `?categoryId=1&active=true&name=Azul`)
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/products/:id/images`
- `GET /api/products/:id/images`
- `PUT /api/products/:id/images/:imageId`
- `DELETE /api/products/:id/images/:imageId`
- `POST /api/products/:id/prices`
- `GET /api/products/:id/prices`
- `PUT /api/products/:id/prices/:priceId`
- `DELETE /api/products/:id/prices/:priceId`

## 5. Verificar Logs

### Com Docker:
```bash
docker-compose logs -f api
```

### Localmente:
Os logs aparecem diretamente no terminal onde você executou `npm run dev`

## 6. Troubleshooting

### Erro de conexão com banco:
- Verifique se o MySQL está rodando
- Confirme as credenciais no `.env`
- Com Docker: `docker-compose logs mysql`

### Erro 404:
- Verifique se a rota está correta
- Confirme que o servidor está rodando

### Erro 400:
- Verifique o formato JSON da requisição
- Confirme que todos os campos obrigatórios estão presentes

### Erro 500:
- Verifique os logs do servidor
- Confirme que as tabelas foram criadas no banco
