// Heurística: primeiro nome + Sr./Sra.
const getTratamento = (name = '') => {
  const primeiro = name.trim().split(' ')[0];
  const isFeminino = /[aáâãà]$/i.test(primeiro) && !['luca', 'silva', 'souza', 'costa'].includes(primeiro.toLowerCase());
  return `${isFeminino ? 'Sra.' : 'Sr.'} ${primeiro}`;
};

/**
 * Gera mensagem pós-consulta ou no-show.
 * Templates fixos conforme especificação.
 * @param {object} patient - { name }
 * @param {'attended' | 'no_show'} situation
 */
const generate = async (patient, situation = 'attended') => {
  const tratamento = getTratamento(patient.name);

  if (situation === 'no_show') {
    return `${tratamento}, sentimos sua falta hoje. Aconteceu algo? Se desejar, podemos reagendar seu horário.`;
  }

  // attended — enviado 24h após a consulta
  return `Bom dia, ${tratamento}. Como o(a) senhor(a) está se sentindo após o atendimento de ontem?`;
};

module.exports = { generate };
