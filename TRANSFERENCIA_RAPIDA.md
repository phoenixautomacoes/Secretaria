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

## Passo 2 — Adicionar as senhas do projeto (Secrets)

No menu esquerdo do Replit, clique no **ícone de cadeado 🔒 (Secrets)** e cadastre os 3 itens abaixo.

> **Peça os valores ao desenvolvedor anterior — são as mesmas senhas que ele usava.**

| Nome | O que é |
|------|---------|
| `N8N_API_KEY` | Chave de acesso ao n8n |
| `SESSION_SECRET` | Senha de sessão do painel |
| `CHATWOOT_TOKEN` | Token de acesso ao Chatwoot |

Para adicionar cada um: clique em **"+ New secret"**, coloque o nome exato da tabela acima, cole o valor e salve.

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

## Pronto! ✅

O servidor com a IA, WhatsApp e agendamentos **já estava funcionando antes e continua funcionando** — você apenas conectou o painel web à mesma estrutura.

---

## Algo não funcionou?

| Problema | Solução |
|----------|---------|
| Painel não abre | Verifique se todos os 3 Secrets foram cadastrados corretamente |
| IA não responde no WhatsApp | O problema é no servidor — acesse `https://n8n.healthhacks.store` e verifique se os workflows estão ativos |
| Dados não aparecem no painel | Confirme com o desenvolvedor anterior os valores corretos dos Secrets |
