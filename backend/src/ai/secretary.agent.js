const { chat, chatWithTools } = require('./client');
const prisma = require('../config/prisma');
const logger = require('../shared/utils/logger');
const { CLINIC_NAME, CLINIC_WHATSAPP } = require('../config/env');

// ─── Ferramentas da secretária ────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'verificar_horarios',
      description: 'Verifica horários disponíveis para agendamento em uma data específica.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'Data no formato YYYY-MM-DD. Exemplo: 2025-04-15',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agendar_consulta',
      description: 'Agenda uma consulta para o paciente na data e hora especificadas.',
      parameters: {
        type: 'object',
        properties: {
          data_hora: {
            type: 'string',
            description: 'Data e hora no formato ISO 8601. Exemplo: 2025-04-15T10:00:00',
          },
          tipo: {
            type: 'string',
            description: 'Tipo da consulta. Exemplo: Consulta inicial, Retorno, Avaliação',
          },
        },
        required: ['data_hora'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_consulta',
      description: 'Cancela uma consulta agendada do paciente.',
      parameters: {
        type: 'object',
        properties: {
          consulta_id: {
            type: 'string',
            description: 'ID da consulta a ser cancelada',
          },
        },
        required: ['consulta_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remarcar_consulta',
      description: 'Remarca uma consulta para outro horário disponível.',
      parameters: {
        type: 'object',
        properties: {
          consulta_id: {
            type: 'string',
            description: 'ID da consulta a ser remarcada',
          },
          nova_data_hora: {
            type: 'string',
            description: 'Nova data e hora no formato ISO 8601',
          },
        },
        required: ['consulta_id', 'nova_data_hora'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'minhas_consultas',
      description: 'Lista todas as consultas agendadas ou passadas do paciente.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'salvar_cadastro',
      description: 'Salva o nome e/ou e-mail do paciente após ele informar na conversa.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome completo do paciente' },
          email: { type: 'string', description: 'E-mail do paciente' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'memorizar_info',
      description:
        'Salva uma informação importante sobre o paciente para lembrar em conversas futuras. Use sempre que o paciente informar algo relevante: motivo da consulta, plano de saúde, condições de saúde, preferências, quem indicou, etc.',
      parameters: {
        type: 'object',
        properties: {
          chave: {
            type: 'string',
            description:
              'Nome curto do campo em snake_case. Exemplos: motivo_consulta, plano_saude, condicao_saude, indicado_por, preferencia_horario',
          },
          valor: {
            type: 'string',
            description: 'Valor a ser salvo. Seja descritivo.',
          },
        },
        required: ['chave', 'valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'chamar_humano',
      description:
        'Escala o atendimento para um humano quando a solicitação está fora do escopo da secretária ou quando o paciente pede explicitamente.',
      parameters: {
        type: 'object',
        properties: {
          motivo: {
            type: 'string',
            description: 'Motivo do escalonamento',
          },
        },
        required: ['motivo'],
      },
    },
  },
];

// ─── Execução das ferramentas ─────────────────────────────────────────────────

const executeTool = async (name, args, patient) => {
  switch (name) {
    case 'verificar_horarios': {
      const day = new Date(args.data);
      day.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);

      const booked = await prisma.appointment.findMany({
        where: {
          startsAt: { gte: day, lte: end },
          status: { notIn: ['CANCELLED'] },
        },
        select: { startsAt: true, duration: true },
      });

      const slots = [];
      for (let h = 8; h < 18; h++) {
        const slot = new Date(day);
        slot.setHours(h, 0, 0, 0);
        if (slot < new Date()) continue; // não mostra horários passados

        const busy = booked.some((a) => {
          const s = new Date(a.startsAt);
          const f = new Date(s.getTime() + a.duration * 60000);
          return slot >= s && slot < f;
        });

        if (!busy) {
          slots.push(
            slot.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
          );
        }
      }

      if (!slots.length) {
        return `Não há horários disponíveis em ${new Date(args.data).toLocaleDateString('pt-BR')}.`;
      }
      return `Horários disponíveis em ${new Date(args.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })}: ${slots.join(', ')}.`;
    }

    case 'agendar_consulta': {
      const startsAt = new Date(args.data_hora);

      // Verificar se horário está disponível
      const conflict = await prisma.appointment.findFirst({
        where: {
          startsAt: { gte: new Date(startsAt.getTime() - 59 * 60000), lte: new Date(startsAt.getTime() + 59 * 60000) },
          status: { notIn: ['CANCELLED'] },
        },
      });

      if (conflict) {
        return `Horário ${startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} indisponível. Por favor escolha outro.`;
      }

      const endsAt = new Date(startsAt.getTime() + 60 * 60000);

      const appt = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          startsAt,
          endsAt,
          duration: 60,
          title: args.tipo || 'Consulta',
          status: 'CONFIRMED',
        },
      });

      // Avança paciente no pipeline
      if (patient.pipelineStage === 'LEAD' || patient.pipelineStage === 'QUALIFIED') {
        await prisma.patient.update({
          where: { id: patient.id },
          data: { pipelineStage: 'SCHEDULED' },
        });
      }

      const dateStr = startsAt.toLocaleString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });

      return `Consulta agendada com sucesso! 📅\nData: ${dateStr}\nTipo: ${args.tipo || 'Consulta'}\nID: ${appt.id}`;
    }

    case 'cancelar_consulta': {
      const appt = await prisma.appointment.findFirst({
        where: { id: args.consulta_id, patientId: patient.id },
      });

      if (!appt) return 'Consulta não encontrada ou não pertence a este paciente.';
      if (appt.status === 'CANCELLED') return 'Esta consulta já foi cancelada.';

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'CANCELLED' },
      });

      const dateStr = new Date(appt.startsAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });

      return `Consulta do dia ${dateStr} cancelada com sucesso.`;
    }

    case 'remarcar_consulta': {
      const appt = await prisma.appointment.findFirst({
        where: { id: args.consulta_id, patientId: patient.id },
      });

      if (!appt) return 'Consulta não encontrada.';

      const nova = new Date(args.nova_data_hora);
      const novaFim = new Date(nova.getTime() + appt.duration * 60000);

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { startsAt: nova, endsAt: novaFim, status: 'CONFIRMED' },
      });

      const dateStr = nova.toLocaleString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });

      return `Consulta remarcada com sucesso! Nova data: ${dateStr}.`;
    }

    case 'minhas_consultas': {
      const appointments = await prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          status: { notIn: ['CANCELLED'] },
          startsAt: { gte: new Date() },
        },
        orderBy: { startsAt: 'asc' },
        take: 5,
      });

      if (!appointments.length) {
        return 'Você não possui consultas agendadas no momento.';
      }

      const list = appointments
        .map((a) => {
          const d = new Date(a.startsAt).toLocaleString('pt-BR', {
            weekday: 'short', day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          });
          return `• ${d} — ${a.title} (ID: ${a.id})`;
        })
        .join('\n');

      return `Suas consultas agendadas:\n${list}`;
    }

    case 'salvar_cadastro': {
      const update = {};
      if (args.nome) update.name = args.nome;
      if (args.email) update.email = args.email;
      if (Object.keys(update).length) {
        await prisma.patient.update({ where: { id: patient.id }, data: update });
      }
      return `Cadastro atualizado: ${JSON.stringify(update)}`;
    }

    case 'memorizar_info': {
      const campos = patient.customFields || {};
      campos[args.chave] = args.valor;
      await prisma.patient.update({
        where: { id: patient.id },
        data: { customFields: campos },
      });
      logger.info('[SecretaryAgent] Info memorizada', { patientId: patient.id, chave: args.chave });
      return `Informação salva: ${args.chave} = ${args.valor}`;
    }

    case 'chamar_humano': {
      const conversation = await prisma.conversation.findFirst({
        where: { patientId: patient.id, status: 'OPEN' },
        orderBy: { updatedAt: 'desc' },
      });

      if (conversation) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { mode: 'HUMAN', status: 'PENDING_HUMAN' },
        });
      }

      return `__ESCALATE__:${args.motivo}`;
    }

    default:
      return 'Ferramenta desconhecida.';
  }
};

// ─── Prompt do sistema ────────────────────────────────────────────────────────

const TRANSBORDO_KEYWORDS = ['atendente', 'falar com humano', 'falar com uma pessoa', 'quero uma pessoa', 'falar com recepção', 'falar com a recepção'];

// Retorna "Sr." ou "Sra." + primeiro nome
const getTratamento = (name = '') => {
  const primeiro = name.trim().split(' ')[0];
  // heurística simples: nomes terminados em 'a' → Sra., demais → Sr.
  const isFeminino = /[aáâãà]$/i.test(primeiro) && !['luca', 'silva', 'souza', 'costa'].includes(primeiro.toLowerCase());
  return `${isFeminino ? 'Sra.' : 'Sr.'} ${primeiro}`;
};

const buildSystemPrompt = (patient) => {
  const hora = new Date().getHours();
  const saudacaoPadrao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const isNewPatient = !patient || patient.name.startsWith('Contato');
  const tratamento = patient && !isNewPatient ? getTratamento(patient.name) : 'senhor(a)';

  return `Você é Priscila, secretária da ${CLINIC_NAME || 'Dra. Pâmela'}. Responda SEMPRE em português formal, sem emojis.

IDENTIDADE: Seu nome é Priscila. Nunca diga que é IA ou robô.

TRATAMENTO: Sempre chame o paciente de "Sr. [Primeiro Nome]" ou "Sra. [Primeiro Nome]". Nunca use o nome sem o tratamento.

${isNewPatient
  ? `SAUDAÇÃO: Esta é a primeira mensagem. Inicie com: "${saudacaoPadrao}, sou a Priscila, secretária da Dra. Pâmela. Como posso ajudar?"`
  : `SAUDAÇÃO: Paciente já conhecido. NÃO se apresente. Responda diretamente usando o tratamento "${tratamento}".`
}

REGRAS:
- Responda apenas o que for perguntado. Não ofereça serviços sem solicitação.
- Respostas curtas e objetivas (máximo 3 linhas).
- Se o paciente ainda não informou o nome completo (nome começa com "Contato"), peça o nome antes de continuar.
- Para agendar: confirme data/hora com o paciente antes de usar a ferramenta.
- Se perguntar sobre plano de saúde: responda normalmente.
- Se pedir atendente, humano ou recepção: use chamar_humano imediatamente.
- Atendimento seg-sex 08h-18h. Consultas de 60 min.
- Nunca invente valores ou informações.

SERVIÇOS (informe só quando perguntado): profilaxia, clareamento (consultório/caseiro), placa miorrelaxante, restaurações, próteses, extrações, atendimento infantil, botox, preenchimento labial, preenchimento nasolabial, preenchimento labiomentoniano.

MEMÓRIA: Use informações já salvas. Nunca pergunte algo que já foi informado. Ao aprender algo relevante (motivo, plano, condição), use memorizar_info.`;
};

// ─── Resumo automático de conversa ───────────────────────────────────────────

const RECENT_MESSAGES = 15;
const SUMMARY_THRESHOLD = 20;

/**
 * Gera/atualiza resumo das mensagens antigas e salva em customFields do paciente.
 */
const getOrCreateConversationSummary = async (patient, oldMessages) => {
  if (!oldMessages.length) return null;

  const existing = patient.customFields?.conversa_resumo;
  const transcript = oldMessages
    .map((m) => `${m.direction === 'IN' ? 'Paciente' : 'Secretária'}: ${m.content}`)
    .join('\n');

  const prompt = existing
    ? `Você tem um resumo anterior de conversa com o paciente:\n\n"${existing}"\n\nAtualize-o incorporando as mensagens abaixo. Mantenha informações importantes anteriores e adicione as novas. Máximo 200 palavras.\n\n${transcript}`
    : `Resuma a conversa abaixo entre paciente e secretária de clínica. Capture: intenção, dados fornecidos (nome, e-mail, motivo, plano de saúde, etc.), consultas mencionadas e contexto relevante. Máximo 150 palavras.\n\n${transcript}`;

  try {
    const summary = await chat(
      [{ role: 'user', content: prompt }],
      { model: 'gpt-4o-mini', temperature: 0.3, maxTokens: 300 }
    );

    const updatedFields = { ...(patient.customFields || {}), conversa_resumo: summary };
    await prisma.patient.update({ where: { id: patient.id }, data: { customFields: updatedFields } });
    logger.info('[SecretaryAgent] Resumo de conversa atualizado', { patientId: patient.id });
    return summary;
  } catch (err) {
    logger.warn('[SecretaryAgent] Falha ao gerar resumo', { error: err.message });
    return existing || null;
  }
};

// ─── Contexto rico do paciente ────────────────────────────────────────────────

const buildPatientContext = async (patient) => {
  const lines = [
    `Nome: ${patient.name}`,
    `Telefone: ${patient.phone}`,
    `E-mail: ${patient.email || '(não informado)'}`,
    `Etapa no pipeline: ${patient.pipelineStage}`,
  ];

  if (patient.notes) lines.push(`Observações: ${patient.notes}`);

  // Campos customizados (exclui resumo de conversa — vai em bloco separado)
  const custom = patient.customFields || {};
  const infoKeys = Object.keys(custom).filter((k) => k !== 'conversa_resumo');
  if (infoKeys.length) {
    lines.push('Informações salvas:');
    for (const k of infoKeys) lines.push(`  - ${k}: ${custom[k]}`);
  }

  // Últimas 3 consultas passadas
  const past = await prisma.appointment.findMany({
    where: { patientId: patient.id, startsAt: { lt: new Date() } },
    orderBy: { startsAt: 'desc' },
    take: 3,
  });
  if (past.length) {
    lines.push('Histórico de consultas anteriores:');
    for (const a of past) {
      const d = new Date(a.startsAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });
      lines.push(`  - ${d} — ${a.title} (${a.status})`);
    }
  }

  // Próximas consultas
  const upcoming = await prisma.appointment.findMany({
    where: { patientId: patient.id, startsAt: { gte: new Date() }, status: { notIn: ['CANCELLED'] } },
    orderBy: { startsAt: 'asc' },
    take: 3,
  });
  if (upcoming.length) {
    lines.push('Consultas agendadas (futuras):');
    for (const a of upcoming) {
      const d = new Date(a.startsAt).toLocaleString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });
      lines.push(`  - ${d} — ${a.title} (ID: ${a.id})`);
    }
  }

  return lines.join('\n');
};

// ─── Agente principal ─────────────────────────────────────────────────────────

/**
 * Gera resposta da secretária para uma mensagem recebida.
 * Executa ferramentas em loop até ter uma resposta final.
 */
const respond = async ({ patient, conversation, message }) => {
  try {
    // Detecção imediata de transbordo por palavras-chave (antes da IA)
    const msgLower = message.toLowerCase();
    const transbordoDetectado = TRANSBORDO_KEYWORDS.some((kw) => msgLower.includes(kw));
    if (transbordoDetectado) {
      await prisma.conversation.updateMany({
        where: { id: conversation.id },
        data: { mode: 'HUMAN', status: 'PENDING_HUMAN' },
      });
      logger.info('[SecretaryAgent] Transbordo por palavra-chave', { patientId: patient.id, message });
      return `Vou encaminhar para a recepção. Um momento.`;
    }

    // Busca todo o histórico da conversa
    const allHistory = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    // Separa antigas das recentes (exclui a última = mensagem atual)
    const withoutCurrent = allHistory.slice(0, -1);

    // Primeira mensagem do paciente → saudação em partes (3 mensagens separadas)
    const isPrimeiroContato = withoutCurrent.length === 0 && patient.name.startsWith('Contato');
    if (isPrimeiroContato) {
      const hora = new Date().getHours();
      const saudacao = hora < 12 ? 'Bom dia,' : hora < 18 ? 'Boa tarde,' : 'Boa noite,';

      const isSoSaudacao = /^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hi|hello)\s*[!.]?\s*$/i.test(message.trim());
      if (isSoSaudacao) {
        return [saudacao, 'Sou a Priscila, secretária da Dra. Pâmela.', 'Como posso ajudar?'];
      }

      // Mensagem com intenção → injeta a intro no histórico e deixa a IA continuar
      const introTexto = `${saudacao} Sou a Priscila, secretária da Dra. Pâmela. Como posso ajudar?`;
      allHistory.splice(allHistory.length - 1, 0, {
        id: '_intro', direction: 'OUT', content: introTexto, createdAt: new Date(),
      });
    }
    const needsSummary = withoutCurrent.length > SUMMARY_THRESHOLD;
    const oldMessages = needsSummary ? withoutCurrent.slice(0, -RECENT_MESSAGES) : [];
    const recentMessages = needsSummary ? withoutCurrent.slice(-RECENT_MESSAGES) : withoutCurrent;

    // Gera/atualiza resumo das mensagens antigas se necessário
    let conversationSummary = patient.customFields?.conversa_resumo || null;
    if (oldMessages.length > 0) {
      conversationSummary = await getOrCreateConversationSummary(patient, oldMessages);
    }

    // Contexto rico do paciente
    const patientContext = await buildPatientContext(patient);

    const horaAtual = new Date().getHours();
    const saudacaoExemplo = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';
    const isNewPat = patient.name.startsWith('Contato');
    const exemploAssistente = isNewPat
      ? `${saudacaoExemplo}, sou a Priscila, secretária da Dra. Pâmela. Como posso ajudar?`
      : `${saudacaoExemplo}, ${getTratamento(patient.name)}. Em que posso ajudar?`;

    const messages = [
      { role: 'system', content: buildSystemPrompt(patient) },
      { role: 'system', content: `DADOS DO PACIENTE:\n${patientContext}` },
      // Few-shot: mostra exatamente como Priscila responde
      { role: 'user', content: 'oi' },
      { role: 'assistant', content: exemploAssistente },
    ];

    if (conversationSummary) {
      messages.push({
        role: 'system',
        content: `=== RESUMO DA CONVERSA ANTERIOR ===\n${conversationSummary}`,
      });
    }

    messages.push(
      ...recentMessages.map((m) => ({
        role: m.direction === 'IN' ? 'user' : 'assistant',
        content: m.content,
      }))
    );

    messages.push({ role: 'user', content: message });

    // Loop de function calling (máx 5 iterações)
    for (let i = 0; i < 5; i++) {
      const response = await chatWithTools(messages, TOOLS);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        const text = response.content;

        if (text?.includes('__ESCALATE__')) {
          const motivo = text.split('__ESCALATE__:')[1] || 'Solicitação do paciente';
          logger.info('[SecretaryAgent] Escalonando para humano', { patientId: patient.id, motivo });
          return `Vou encaminhar para a recepção. Um momento.`;
        }

        return text;
      }

      messages.push({ role: 'assistant', content: response.content, tool_calls: response.tool_calls });

      for (const toolCall of response.tool_calls) {
        const fnName = toolCall.function.name;
        let args;

        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        logger.info('[SecretaryAgent] Executando ferramenta', { tool: fnName, args });

        // Recarrega paciente para ter customFields atualizados após memorizar_info
        const freshPatient = await prisma.patient.findUnique({ where: { id: patient.id } });
        const result = await executeTool(fnName, args, freshPatient || patient);

        if (result.startsWith('__ESCALATE__')) {
          logger.info('[SecretaryAgent] Escalonado para humano', { patientId: patient.id });
          return `Vou encaminhar para a recepção. Um momento.`;
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }

    return 'Desculpe, estamos com uma instabilidade momentânea. Por favor, tente novamente em instantes.';
  } catch (err) {
    logger.error('[SecretaryAgent] Erro', { error: err.message });
    return null;
  }
};

module.exports = { respond };
