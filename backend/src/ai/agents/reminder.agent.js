// Heurística: primeiro nome + Sr./Sra.
const getTratamento = (name = '') => {
  const primeiro = name.trim().split(' ')[0];
  const isFeminino = /[aáâãà]$/i.test(primeiro) && !['luca', 'silva', 'souza', 'costa'].includes(primeiro.toLowerCase());
  return `${isFeminino ? 'Sra.' : 'Sr.'} ${primeiro}`;
};

/**
 * Gera lembrete de consulta com template fixo.
 * @param {object} patient - { name }
 * @param {object} appointment - { startsAt, title }
 * @param {'24h' | '1h'} window
 */
const generate = async (patient, appointment, window = '24h') => {
  const tratamento = getTratamento(patient.name);

  const startsAt = new Date(appointment.startsAt);
  const hora = startsAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });

  if (window === '24h') {
    return `Bom dia, ${tratamento}. Passando para confirmar seu horário com a Dra. Pâmela amanhã às ${hora}. Podemos confirmar?`;
  }

  if (window === '1h') {
    return `${tratamento}, só um lembrete: sua consulta com a Dra. Pâmela é em aproximadamente 1 hora, às ${hora}. Até logo.`;
  }

  return `${tratamento}, lembrando de sua consulta com a Dra. Pâmela às ${hora}.`;
};

module.exports = { generate };
