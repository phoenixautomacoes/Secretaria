# 🦷 Transferência do Projeto — Secretária IA

> **Tempo estimado: 10 minutos**
> O servidor (n8n, WhatsApp, Chatwoot) já está funcionando. Você só precisa configurar o painel web no Replit.

---

## Passo 1 — Abrir o projeto no Replit

1. Acesse [replit.com](https://replit.com) e faça login na sua conta
2. Clique em **"+ Create Repl"**
3. Selecione a aba **"Import from GitHub"**
4. Cole o endereço: `https://github.com/phoenixautomacoes/Secretaria`
5. Clique em **"Import from GitHub"** e aguarde carregar

---

## Passo 2 — Adicionar os Secrets do projeto

No menu esquerdo do Replit, clique no **ícone de cadeado 🔒 (Secrets)** e cadastre os itens abaixo.

| Nome | Valor |
|------|-------|
| `N8N_API_KEY` | *(pegar com o desenvolvedor anterior)* |
| `SESSION_SECRET` | *(pegar com o desenvolvedor anterior)* |
| `CHATWOOT_TOKEN` | *(pegar com o desenvolvedor anterior)* |
| `WEBHOOK_SECRET` | `9193b566300d45e1b0722f2d58ada391ed372aa8af04b544` |
| `VPS_PASSWORD` | *(senha SSH do servidor — pegar com o desenvolvedor anterior)* |

Para adicionar cada um: clique em **"+ New secret"**, coloque o nome exato e cole o valor.

---

## Passo 3 — Iniciar o projeto

1. Clique no botão **"Run"** (▶ verde no topo)
2. Aguarde 1-2 minutos
3. O painel de agendamentos vai aparecer no lado direito

---

## Passo 4 — Confirmar que tudo funciona

- [ ] O painel web abre e mostra os agendamentos
- [ ] Envie uma mensagem de teste para o WhatsApp da clínica — a IA deve responder normalmente
- [ ] Acesse o Chatwoot (`https://chat.healthhacks.store`) e veja a conversa aparecer

---

## Referências do servidor (187.77.255.96)

| Serviço | URL | Credencial |
|---------|-----|------------|
| n8n | https://n8n.healthhacks.store | *(pegar com dev anterior)* |
| Chatwoot | https://chat.healthhacks.store | *(pegar com dev anterior)* |
| WAHA (WhatsApp API) | https://evo.healthhacks.store | API Key: `WahaApi2026` |
| WAHA Dashboard | https://evo.healthhacks.store/dashboard | User: `admin` / Pass: `Clinica2026` |

---

## Pronto! ✅

O servidor com a IA, WhatsApp e agendamentos **já estava funcionando antes e continua funcionando** — você apenas conectou o painel web à mesma estrutura.

---

## Algo não funcionou?

| Problema | Solução |
|----------|---------|
| Painel não abre | Verifique se todos os Secrets foram cadastrados corretamente |
| IA não responde no WhatsApp | Acesse `https://n8n.healthhacks.store` e verifique se os workflows estão ativos |
| Dados não aparecem no painel | Confirme com o desenvolvedor anterior os valores dos Secrets |
