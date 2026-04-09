#!/bin/bash

# ============================================
# Script de Deploy - Quadro Elétrico
# Escolha uma opção para fazer o deploy
# ============================================

echo "🚀 Deploy - Ficha de Campo Quadro Elétrico"
echo ""
echo "Escolha uma opção:"
echo ""
echo "1) Servidor Local (Python) - Testar no computador"
echo "2) GitHub Pages - Hospedar grátis online"
echo "3) Netlify CLI - Deploy manual"
echo "4) Sair"
echo ""
read -p "Opção: " opcao

case $opcao in
    1)
        echo ""
        echo "📁 Iniciando servidor local na porta 8000..."
        echo "📱 Acesse no navegador: http://localhost:8000/html/quadro_eletrico.html"
        echo "📱 No celular (mesma rede): http://SEU-IP:8000/html/quadro_eletrico.html"
        echo ""
        echo "Pressione Ctrl+C para parar o servidor"
        echo ""
        python3 -m http.server 8000
        ;;
    2)
        echo ""
        echo "📦 GitHub Pages - Instruções:"
        echo ""
        echo "1. Crie uma conta em: https://github.com"
        echo "2. Crie um novo repositório chamado 'quadro-eletrico'"
        echo "3. Faça upload de todos os arquivos desta pasta"
        echo "4. Vá em Settings → Pages → Source: Deploy from branch"
        echo "5. Selecione branch 'main' e pasta '/ (root)'"
        echo "6. Clique em Save"
        echo ""
        echo "⏳ Aguarde 1-2 minutos para o deploy"
        echo "🌐 Sua URL será: https://SEU-USUARIO.github.io/quadro-eletrico/html/quadro_eletrico.html"
        echo ""
        ;;
    3)
        echo ""
        echo "📦 Netlify - Verificando se CLI está instalado..."
        if command -v netlify &> /dev/null; then
            echo "✅ Netlify CLI encontrado"
            echo ""
            read -p "Já tem conta no Netlify? (s/n): " tem_conta
            if [ "$tem_conta" = "n" ]; then
                echo "1. Acesse https://netlify.com e crie uma conta"
                echo "2. Execute: netlify login"
                echo "3. Execute este script novamente"
            else
                echo "Fazendo deploy..."
                cd ..
                netlify deploy --prod --dir=formulario
            fi
        else
            echo "❌ Netlify CLI não instalado"
            echo ""
            echo "Instale com:"
            echo "  npm install -g netlify-cli"
            echo ""
            echo "Ou use a opção 2 (GitHub Pages) que não requer instalação"
        fi
        ;;
    4)
        echo "Saindo..."
        exit 0
        ;;
    *)
        echo "Opção inválida"
        ;;
esac