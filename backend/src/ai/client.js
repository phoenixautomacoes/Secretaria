const OpenAI = require('openai');
const { OPENAI_API_KEY } = require('../config/env');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/** Chat simples — retorna string */
const chat = async (messages, { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 500 } = {}) => {
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });
  return response.choices[0].message.content.trim();
};

/** Chat com ferramentas (function calling) — retorna o objeto message completo */
const chatWithTools = async (messages, tools, { model = 'gpt-4o-mini', temperature = 0.3 } = {}) => {
  const response = await openai.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: 'auto',
    temperature,
    max_tokens: 800,
  });
  return response.choices[0].message;
};

module.exports = { chat, chatWithTools };
