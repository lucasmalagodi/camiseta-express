#!/bin/bash
set -e

VPS_USER="root"
VPS_HOST="31.97.22.124"  # IP ou domínio para SSH/rsync
VPS_PATH="/var/www/ancdcampanha/fts"

# Verificar se estamos na pasta fts
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Este script deve ser executado na pasta fts/"
    echo "💡 Execute: cd fts && ./deploy.sh"
    exit 1
fi

echo "📦 Buildando projeto frontend..."
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

echo "📁 Criando pasta no VPS e limpando arquivos antigos..."
ssh $VPS_USER@$VPS_HOST << EOF
mkdir -p $VPS_PATH
rm -rf $VPS_PATH/*
EOF

echo "🚀 Enviando arquivos ($BUILD_FOLDER)..."
rsync -avz ./$BUILD_FOLDER/ $VPS_USER@$VPS_HOST:$VPS_PATH/

echo "✅ Deploy do frontend finalizado com sucesso!"
echo ""
echo "📝 Próximos passos no servidor:"
echo "   1. Execute o script setup-docker.sh para configurar o Docker"
echo "   2. Ou execute manualmente: docker-compose -f docker-compose.prod.yml up -d"