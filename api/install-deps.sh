#!/bin/bash
# Script para instalar dependências evitando problemas com zsh

set -e

echo "📦 Limpando cache e node_modules..."
rm -rf node_modules package-lock.json
npm cache clean --force 2>/dev/null || true

echo "📥 Instalando dependências..."
npm install --legacy-peer-deps

echo "✅ Instalação concluída!"
