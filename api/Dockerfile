FROM node:18

WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar todas as dependências (incluindo devDependencies para compilar TypeScript)
RUN npm install

# Copiar código fonte
COPY src ./src

# Compilar TypeScript para produção
RUN npm run build

# Remover devDependencies para reduzir tamanho da imagem (opcional)
RUN npm prune --production

EXPOSE 5000

# Usar start para produção (executa código compilado)
CMD ["npm", "run", "start"]
