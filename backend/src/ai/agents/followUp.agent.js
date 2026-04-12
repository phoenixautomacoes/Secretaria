// Heurística: primeiro nome + Sr./Sra.
const getTratamento = (name = '') => {
  const primeiro = name.trim().split(' ')[0];
  const isFeminino = /[aáâãà]$/i.test(primeiro) && !['luca', 'silva', 'souza', 'costa'].includes(primeiro.toLowerCase());
  return `${isFeminino ? 'Sra.' : 'Sr.'} ${primeiro}`;
};

/**
 * Gera mensagem de follow-up para lead sem resposta (4h).
 * Template fixo conforme especificação.
 * @param {object} patient - { name }
 */
const generate = async (patient) => {
  const tratamento = getTratamento(patient.name);
  return `${tratamento}, ficou alguma dúvida que eu possa esclarecer?`;
};

module.exports = { generate };
