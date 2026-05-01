# 🦷 Guia de Configuração — Secretária IA Clínica Odonto

> **Para quem vai configurar:** Siga este guia do início ao fim, na ordem exata. Cada passo depende do anterior.

---

## O que você vai configurar

- **Painel web** de agendamentos (hospedado no Replit)
- **IA receptionist** via WhatsApp (n8n + Chatwoot + Baileys no seu servidor)
- **Google Calendar** para gestão de agenda
- **ElevenLabs** para respostas em áudio (opcional)

---

## PARTE 1 — Configurar o Replit

### 1.1 — Importar o projeto do GitHub

1. Acesse [replit.com](https://replit.com) e faça login
2. Clique em **"+ Create Repl"**
3. Selecione **"Import from GitHub"**
4. Cole o link: `https://github.com/phoenixautomacoes/Secretaria`
5. Aguarde a importação terminar
6. O projeto vai abrir automaticamente

### 1.2 — Configurar os Secrets do Replit

No menu esquerdo do Replit, clique no **ícone de cadeado (Secrets)** e adicione os seguintes secrets:

| Nome do Secret | O que colocar |
|----------------|---------------|
| `N8N_API_KEY` | Chave de API do seu n8n (Settings → n8n API → Create Key) |
| `SESSION_SECRET` | Qualquer texto aleatório longo (ex: `minha-clinica-secreta-2025-xpto`) |
| `GITHUB_TOKEN` | *(opcional)* Token GitHub para futuros backups |
| `CHATWOOT_TOKEN` | Access Token do seu Chatwoot (Profile → Access Token) |

### 1.3 — Iniciar o projeto

1. Clique no botão **"Run"** (triângulo verde) no topo
2. Aguarde os serviços iniciarem (pode levar 1-2 minutos)
3. O painel deve aparecer no lado direito do Replit

---

## PARTE 2 — Configurar o Servidor (VPS)

> **Requisitos do servidor:** Ubuntu 22.04+, mínimo 4GB RAM, Docker instalado

### 2.1 — Instalar o stack completo

Conecte no seu servidor via SSH e rode:

```bash
git clone https://github.com/phoenixautomacoes/Secretaria /opt/whatsapp-stack
cd /opt/whatsapp-stack
docker compose up -d
```

Aguarde todos os containers iniciarem. Verifique com:
```bash
docker ps
```
Devem aparecer: `n8n`, `n8n_db`, `redis`, `chatwoot_rails`, `chatwoot_sidekiq`, `chatwoot_db`, `waha` (ou `baileys-api`), e `traefik`.

### 2.2 — Configurar domínios (Traefik)

Edite o arquivo `docker-compose.yml` e substitua todas as ocorrências de `healthhacks.store` pelo **seu domínio**.

Exemplo: se seu domínio é `minhaclinica.com.br`, o n8n ficará em `n8n.minhaclinica.com.br`.

---

## PARTE 3 — Configurar o n8n

Acesse `https://n8n.seudominio.com` no navegador.

### 3.1 — Criar as credenciais

Vá em **Settings → Credentials → Add Credential** e crie as 5 credenciais abaixo:

#### Credencial 1: PostgreSQL
- **Type:** PostgreSQL
- **Host:** IP interno do container n8n_db (rode `docker inspect n8n_db | grep IPAddress` no servidor)
- **Database:** `n8n`
- **User:** `n8n`
- **Password:** a senha definida no docker-compose.yml
- **SSL:** Desabilitado

#### Credencial 2: Chatwoot fazer.ai
- **Type:** Chatwoot fazer.ai account
- **URL:** `https://chat.seudominio.com`
- **API Token:** Access Token do admin do Chatwoot

#### Credencial 3: OpenAI
- **Type:** OpenAI
- **API Key:** sua chave da OpenAI (platform.openai.com → API Keys)

#### Credencial 4: Google Calendar
- **Type:** Google Calendar OAuth2
- Siga o fluxo OAuth para conectar sua conta Google

#### Credencial 5: ElevenLabs
- **Type:** ElevenLabs API
- **API Key:** sua chave do ElevenLabs (elevenlabs.io → Profile → API Keys)

### 3.2 — Importar os workflows

Os arquivos de workflow ficam hospedados automaticamente pelo Replit. Descubra a URL base do seu Replit (aparece no topo do preview) e use-a nos comandos abaixo.

No servidor, rode **um por um** (substitua `SEU-REPLIT-URL` pela URL do seu Replit):

```bash
URL_BASE="https://SEU-REPLIT-URL/clinica/workflows"

for NUM in 00 01 02 03 04 05 06 07 08; do
  docker exec n8n wget -q -O /tmp/wf${NUM}.json "${URL_BASE}/${NUM}_*.json" 2>/dev/null || \
  docker exec n8n n8n import:workflow --input=/tmp/wf${NUM}.json
  echo "Importado: workflow ${NUM}"
done
```

Ou manualmente: baixe cada arquivo `.json` da pasta `/clinica/workflows/` e importe pelo menu **n8n → Workflows → Import from file**.

### 3.3 — Associar credenciais aos workflows

Após importar, para cada workflow (01 ao 08):
1. Abra o workflow no n8n
2. Se aparecer algum nó com ⚠️ amarelo, clique nele
3. Selecione a credencial correspondente no campo "Credential"
4. Salve

### 3.4 — Configurar IDs do Google Calendar

No workflow **02. Buscar janelas profissional**:
1. Clique no nó **"ID agendas"**
2. Para cada profissional, cole o ID do Google Calendar correspondente
   - O ID fica em: Google Calendar → Configurações da agenda → Integrar agenda → "ID da agenda"
   - Se todos compartilham a mesma agenda, cole o mesmo ID em todos

### 3.5 — Ativar os workflows (em ordem)

Ative na seguinte ordem (clique em **Publish** em cada um):

1. `02. Buscar janelas profissional`
2. `03. Criar evento com profissional`
3. `04. Buscar agendamentos do contato`
4. `05. Atualizar agendamento`
5. `06. Cancelar agendamento`
6. `07. Escalar humano v2`
7. `08. Follow-up qualificados`
8. `01. Agente Clínica` ← **por último**

---

## PARTE 4 — Configurar o Chatwoot

Acesse `https://chat.seudominio.com`.

### 4.1 — Criar a conta e inbox do WhatsApp

1. Crie uma conta de administrador
2. Vá em **Settings → Inboxes → Add Inbox**
3. Selecione **"API"** ou **"WhatsApp"** (dependendo do seu setup com Baileys/WAHA)
4. Siga as instruções para conectar o número de WhatsApp

### 4.2 — Configurar labels e atributos (automático)

No n8n, execute o workflow **00. Configurações** uma única vez:
1. Abra o workflow 00
2. Clique em **"Execute workflow"** (botão laranja)
3. Aguarde a execução completa — isso cria automaticamente todas as labels e o funil Kanban no Chatwoot

### 4.3 — Conectar o WhatsApp (Baileys/WAHA)

Acesse `https://waha.seudominio.com` (ou a porta do seu container WAHA) e escaneie o QR code com o WhatsApp do número da clínica.

---

## PARTE 5 — Personalizar a Clínica

### 5.1 — Atualizar o System Prompt com os dados reais

No n8n, abra o workflow **01. Agente Clínica**:
1. Clique no nó **"Agente IA Vendedora"**
2. Em **"System Message"**, localize e edite:

```
# CONTEXTO DA CLÍNICA

### HORÁRIO DE FUNCIONAMENTO
* Coloque seus horários reais aqui

### LOCALIZAÇÃO E CONTATO
* Endereço: seu endereço real
* Telefone: seu telefone real

### PROFISSIONAIS DISPONÍVEIS
| ID (id_profissional) | Profissional | Especialidade |
|----------------------|--------------|---------------|
| `dr-nome-sobrenome`  | Dr. Nome     | Especialidade |
```

3. Edite também o nome da IA (padrão: "Maria") e o nome da clínica (padrão: "Clínica Moreira")
4. Salve e clique em **Publish**

### 5.2 — Atualizar IDs dos profissionais

Os IDs dos profissionais (ex: `dra-ana-costa`) precisam ser os mesmos:
- No System Prompt (tabela de profissionais)
- No nó **"ID agendas"** do workflow 02
- No nó **"ID agendas"** dos workflows 04, 05 e 06

Use sempre o mesmo padrão: `nome-sobrenome` em minúsculas com hífens.

---

## PARTE 6 — Testar o Sistema

### 6.1 — Teste básico

1. Envie uma mensagem de WhatsApp para o número da clínica
2. A IA deve responder em até 10 segundos
3. Peça para agendar uma consulta e veja o fluxo completo

### 6.2 — Verificar no Chatwoot

- Acesse o Chatwoot e veja a conversa aparecer
- Verifique se o card foi criado no Kanban (funil)
- Após agendar, verifique se o evento aparece no Google Calendar

### 6.3 — Verificar no painel web (Replit)

- Acesse a URL do seu Replit
- O painel de agendamentos deve mostrar os agendamentos criados

---

## Problemas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| IA não responde | Workflow 01 não está ativo | Publique o workflow 01 no n8n |
| "Resource not found" | Subworkflows não publicados | Publique 02-08 antes do 01 |
| Erro de credencial | Credencial não associada ao nó | Clique no nó com ⚠️ e selecione a credencial |
| Sem horários disponíveis | ID do Google Calendar errado | Verifique o nó "ID agendas" no workflow 02 |
| Workflow 08 não ativa | Eventos Kanban não suportados | Já convertido para schedule automático — ignore |

---

## Suporte

Em caso de dúvidas, consulte:
- **n8n docs:** docs.n8n.io
- **Chatwoot docs:** www.chatwoot.com/docs
- **Repositório do projeto:** github.com/phoenixautomacoes/Secretaria
