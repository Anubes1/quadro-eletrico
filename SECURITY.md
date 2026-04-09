# 🔒 Guia de Segurança - Deploy no Vercel

## Headers de Segurança Configurados

### 1. **X-Content-Type-Options: nosniff**
Impede o navegador de "adivinhar" o tipo de arquivo. Previne ataques onde arquivos maliciosos são disfarçados.

### 2. **X-Frame-Options: DENY**
Impede que seu site seja carregado dentro de um `<iframe>` em outros sites. Previne ataques de **clickjacking**.

### 3. **X-XSS-Protection: 1; mode=block**
Ativa a proteção contra **XSS (Cross-Site Scripting)** no navegador.

### 4. **Referrer-Policy: strict-origin-when-cross-origin**
Controla quais informações são enviadas no header `Referer` ao navegar para outros sites.

### 5. **Permissions-Policy: camera=(*)...**
Controla quais APIs do navegador o site pode usar:
- `camera=(*)` - permite câmera (necessário para tirar fotos)
- `microphone=()` - bloqueia microfone (não necessário)
- `geolocation=()` - bloqueia geolocalização (opcional)

### 6. **Content-Security-Policy (CSP)**
Define quais fontes de conteúdo são permitidas:
- Apenas scripts e estilos do próprio site
- Imagens permitidas do site, data URIs e blobs
- Bloqueia objects, plugins e iframes externos

### 7. **Strict-Transport-Security (HSTS)**
Força conexão HTTPS por 1 ano. Impede ataques **man-in-the-middle**.

---

## 📱 Configurações Adicionais no Vercel

### **Acessar Configurações do Projeto**

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Security**

### **Configurações Recomendadas**

| Configuração | Valor | Motivo |
|--------------|-------|--------|
| **Password Protection** | Opcional | Protege com senha (recurso Pro) |
| **Trusted IPs** | Se necessário | Restringir acesso por IP |
| **Deployment Protection** | Ativar | Protege branches de preview |

### **Domínio Personalizado com SSL**

1. Settings → Domains
2. Adicione seu domínio (ex: `quadro.suaempresa.com`)
3. Vercel configura SSL automaticamente (Let's Encrypt)

---

## 🔐 Autenticação (Para Proteger o App)

### **Opção Gratuita: Senha Simples via Middleware**

Se precisar proteger com senha simples, crie um middleware:

```javascript
// middleware.js (nível raiz do projeto)
export function middleware(request) {
  const url = new URL(request.url)

  // Pular verificação para assets
  if (url.pathname.match(/\.(css|js|png|jpg|svg|ico|json)$/)) {
    return new Response(null, { status: 200 })
  }

  const authHeader = request.headers.get('authorization')
  const isAuthenticated = authHeader === `Basic ${btoa('admin:sua-senha')}`

  // Verificar cookie de sessão
  const session = request.cookies.get('session')
  if (session?.value === 'authenticated') {
    return new Response(null, { status: 200 })
  }

  if (isAuthenticated) {
    const response = new Response(null, { status: 302 })
    response.headers.set('Set-Cookie', 'session=authenticated; Path=/; HttpOnly; Secure; SameSite=Strict')
    response.headers.set('Location', url.pathname)
    return response
  }

  return new Response('Acesso restrito', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Quadro Eletrico"' }
  })
}

export const config = {
  matcher: '/:path*'
}
```

---

## 🛡️ Boas Práticas de Segurança

### **1. Nunca exponha dados sensíveis no front-end**
- ✅ Dados ficam no localStorage do navegador do usuário
- ✅ Exportação em JSON para envio controlado
- ❌ Não há chaves de API ou senhas no código

### **2. Validação de dados**
Os dados são validados no navegador antes de salvar.

### **3. Backup regular**
Incentive os usuários a exportar o JSON após cada vistoria.

### **4. Controle de acesso**
Se precisar que apenas pessoas autorizadas acessem:

| Método | Custo | Complexidade |
|--------|-------|--------------|
| Senha simples (middleware) | Grátis | Baixa |
| Vercel Password Protection | Pro | Baixa |
| Autenticação com Auth0 | Plano gratuito | Média |
| Login com Google/Microsoft | Grátis limitado | Média |

---

## ⚠️ Limitações do Vercel (Plano Gratuito)

| Recurso | Limite |
|---------|--------|
| Largura de banda | 100GB/mês |
| Builds | 6.000/mês |
| Funções serverless | 160GB-hr/mês |
| Domínios customizados | Ilimitado |
| SSL | Ilimitado (Let's Encrypt) |

**Para uso interno de uma empresa**, o plano gratuito é mais que suficiente!

---

## 📋 Checklist de Segurança

- [x] Headers de segurança configurados (vercel.json)
- [x] HTTPS obrigatório (HSTS)
- [x] CSP para prevenir XSS
- [x] X-Frame-Options para prevenir clickjacking
- [x] Permissões de câmera controladas
- [x] Dados armazenados localmente (não no servidor)
- [ ] Domínio personalizado configurado (opcional)
- [ ] Senha de acesso (se necessário)

---

## 🚀 Deploy Seguro

```bash
# 1. Verifique os arquivos
ls -la

# 2. Deploy para produção
vercel --prod

# 3. Verifique os headers
curl -I https://seu-projeto.vercel.app
```

Headers de segurança verificados:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 📞 Suporte

- Documentação Vercel: https://vercel.com/docs/security
- Security headers: https://securityheaders.com
- Teste seu site: https://securityheaders.com/?q=https://seu-projeto.vercel.app