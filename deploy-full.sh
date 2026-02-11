#!/bin/bash
set -e

VPS_USER="root"
VPS_HOST="187.77.36.114"  # IP ou domínio para SSH/rsync
API_DOMAIN="onzip.com.br"  # Domínio provisório para URLs da API
API_DOMAIN_OFFICIAL="ftravelseries.com.br"  # Domínio oficial
VPS_PATH="/var/www/ancdcampanha"  # Raiz do projeto no servidor

echo "🚀 Deploy Completo - Frontend + Docker"
echo ""

# Verificar se estamos na pasta fts
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Este script deve ser executado na pasta fts/"
    echo "💡 Execute: cd fts && ./deploy-full.sh"
    exit 1
fi

echo "📦 Passo 1/2: Buildando e enviando frontend..."
# Em produção, usar URL relativa /api (Nginx faz proxy reverso)
# Não definir VITE_API_URL para usar o fallback /api do código
# Isso permite que o Nginx faça o proxy reverso corretamente
echo "🔧 Usando URL relativa /api (Nginx fará proxy reverso)"
npm run build

if [ -d "dist" ]; then
  BUILD_FOLDER="dist"
elif [ -d "build" ]; then
  BUILD_FOLDER="build"
else
  echo "❌ Nenhuma pasta de build encontrada."
  exit 1
fi

echo "📡 Testando conexão SSH..."
ssh -o BatchMode=yes -o ConnectTimeout=5 $VPS_USER@$VPS_HOST "echo SSH OK" || {
  echo "❌ Falha ao conectar via SSH. Verifique a rede ou autenticação."
  exit 1
}

echo "📁 Criando estrutura de pastas no VPS..."
ssh $VPS_USER@$VPS_HOST << EOF
mkdir -p $VPS_PATH/fts
mkdir -p $VPS_PATH/fts/api
mkdir -p $VPS_PATH/fts/api/logs
mkdir -p $VPS_PATH/fts/src/assets
rm -rf $VPS_PATH/fts/*.html $VPS_PATH/fts/assets $VPS_PATH/fts/*.js $VPS_PATH/fts/*.css 2>/dev/null || true
EOF

echo "🚀 Enviando arquivos do frontend ($BUILD_FOLDER)..."
rsync -avz ./$BUILD_FOLDER/ $VPS_USER@$VPS_HOST:$VPS_PATH/fts/

echo ""
echo "✅ Frontend deployado com sucesso!"
echo ""
echo "🐳 Passo 2/2: Configurando Docker no servidor..."

# Verificar se os arquivos existem antes de enviar
echo "🔍 Verificando arquivos necessários..."
if [ ! -f "../docker-compose.prod.yml" ]; then
  echo "❌ Arquivo docker-compose.prod.yml não encontrado!"
  exit 1
fi
if [ ! -f "../setup-docker.sh" ]; then
  echo "❌ Arquivo setup-docker.sh não encontrado!"
  exit 1
fi
if [ ! -f "../start-api.sh" ]; then
  echo "❌ Arquivo start-api.sh não encontrado!"
  exit 1
fi
if [ ! -d "../mysql" ]; then
  echo "❌ Pasta mysql não encontrada!"
  exit 1
fi

# Enviar arquivos Docker para a raiz do projeto (ancdcampanha)
echo "📤 Enviando arquivos de configuração Docker..."
rsync -avz --progress --timeout=30 \
  ../docker-compose.prod.yml \
  ../setup-docker.sh \
  ../start-api.sh \
  ../check-api-status.sh \
  ../fix-mysql-user.sh \
  ../reset-mysql-root-password.sh \
  ../update-mysql-password.sh \
  ../fix-xlsx-install.sh \
  ../fix-api-deps.sh \
  ../view-api-logs.sh \
  ../setup-vps.sh \
  ../manage-scripts.sh \
  ../fix-nginx-config.sh \
  ../setup-domain.sh \
  ../fix-certbot-validation.sh \
  ../create-admin-user.sh \
  ../fix-api-proxy.sh \
  ../debug-api-404.sh \
  $VPS_USER@$VPS_HOST:$VPS_PATH/

# Enviar pasta mysql/ separadamente para garantir que a estrutura seja preservada
echo "📤 Enviando pasta mysql/ com arquivos de migração..."
if [ ! -d "../mysql/init" ]; then
  echo "⚠️  Pasta mysql/init não encontrada, mas continuando..."
else
  SQL_FILES_COUNT=$(find ../mysql/init -name "*.sql" -type f | wc -l)
  echo "   Encontrados $SQL_FILES_COUNT arquivo(s) SQL para enviar"
  # Listar arquivos que serão enviados
  echo "   Arquivos SQL que serão enviados:"
  find ../mysql/init -name "*.sql" -type f | sed 's|^\.\./mysql/init/|      - |'
fi
# Usar ../mysql (sem barra final) para preservar a estrutura da pasta
rsync -avz --progress --timeout=30 \
  ../mysql \
  $VPS_USER@$VPS_HOST:$VPS_PATH/

# Enviar pasta da API para fts/api/
echo "📤 Enviando pasta da API para fts/api/..."
if [ ! -d "api" ]; then
  echo "❌ Pasta api não encontrada!"
  exit 1
fi
rsync -avz --progress --timeout=60 \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '*.log' \
  --exclude 'logs' \
  api/ \
  $VPS_USER@$VPS_HOST:$VPS_PATH/fts/api/

# Garantir que a pasta de logs existe e tem permissões corretas
echo "📁 Garantindo que a pasta de logs existe..."
ssh $VPS_USER@$VPS_HOST << EOF
mkdir -p $VPS_PATH/fts/api/logs
chmod 755 $VPS_PATH/fts/api/logs
EOF

# Tornar scripts executáveis no servidor
ssh $VPS_USER@$VPS_HOST "chmod +x $VPS_PATH/setup-docker.sh $VPS_PATH/start-api.sh $VPS_PATH/check-api-status.sh $VPS_PATH/fix-mysql-user.sh $VPS_PATH/reset-mysql-root-password.sh $VPS_PATH/fix-xlsx-install.sh $VPS_PATH/fix-api-deps.sh $VPS_PATH/view-api-logs.sh $VPS_PATH/setup-vps.sh $VPS_PATH/manage-scripts.sh $VPS_PATH/fix-nginx-config.sh $VPS_PATH/setup-domain.sh $VPS_PATH/fix-certbot-validation.sh $VPS_PATH/create-admin-user.sh $VPS_PATH/fix-api-proxy.sh $VPS_PATH/debug-api-404.sh"

# Executar setup-docker.sh no servidor (na raiz do projeto)
echo "🔧 Executando setup-docker.sh no servidor..."
ssh $VPS_USER@$VPS_HOST << EOF
cd $VPS_PATH
./setup-docker.sh
EOF

# Reiniciar a API para aplicar as mudanças
# IMPORTANTE: Em produção, precisamos rebuildar a imagem Docker porque
# o código não está montado como volume
echo ""
echo "🔄 Rebuildando e reiniciando a API para aplicar as mudanças..."
ssh $VPS_USER@$VPS_HOST << EOF
cd $VPS_PATH
./start-api.sh -r
EOF

echo ""
echo "✅ Deploy completo finalizado com sucesso!"
echo ""
echo "📍 Serviços disponíveis no servidor:"
echo "   - MySQL: localhost:3307"
echo "   - phpMyAdmin: https://$API_DOMAIN:8081"
echo "   - API: https://$API_DOMAIN/api (via Nginx proxy reverso)"
echo "   - Frontend: https://$API_DOMAIN (provisório)"
echo "   - Frontend: https://$API_DOMAIN_OFFICIAL (oficial)"
echo ""
echo "📝 Estrutura de pastas criada:"
echo "   - $VPS_PATH/fts/api/logs (logs de importação)"
echo "   - $VPS_PATH/fts/src/assets (assets do frontend)"
echo ""
echo "🔧 Scripts disponíveis no servidor:"
echo "   - setup-vps.sh (configuração inicial do VPS)"
echo "   - manage-scripts.sh (menu interativo de gerenciamento)"
echo "   - setup-docker.sh (configuração Docker)"
echo "   - start-api.sh (iniciar/reiniciar API)"
echo "   - check-api-status.sh (verificar status)"
echo "   - fix-xlsx-install.sh (corrigir instalação xlsx)"
echo "   - fix-api-deps.sh (corrigir dependências)"
echo "   - view-api-logs.sh (visualizar logs)"
echo ""
echo "💡 Certifique-se de que o Nginx está configurado corretamente:"
echo "   - Verifique /etc/nginx/sites-available/$API_DOMAIN.conf"
echo "   - Verifique /etc/nginx/sites-available/$API_DOMAIN_OFFICIAL.conf"
echo "   - O bloco /api/ deve fazer proxy para http://127.0.0.1:5002/api/"
echo ""
echo "📋 Próximos passos (se necessário):"
echo "   1. Verificar logs: ssh $VPS_USER@$VPS_HOST 'tail -f $VPS_PATH/fts/api/logs/import-errors-*.log'"
echo "   2. Verificar status da API: ssh $VPS_USER@$VPS_HOST 'cd $VPS_PATH && ./check-api-status.sh'"
echo "   3. Se houver problemas com dependências: ssh $VPS_USER@$VPS_HOST 'cd $VPS_PATH && ./fix-api-deps.sh'"