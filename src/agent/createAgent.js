import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildToolDefinitions, executeTool } from '../tools/mcpTools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create and initialize Copilot Agent
 * @returns {Promise<object>} Agent instance
 */
export async function createAgent() {
  let agentImpl = null;

  try {
    const copilotSdk = await import('@github/copilot-sdk');
    const { Agent } = copilotSdk;

    if (!Agent) {
      console.warn('⚠️  Copilot SDK Agent class not available, using fallback mode');
      return createFallbackAgent();
    }

    const systemPromptPath = path.join(__dirname, 'systemPrompt.md');
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

    const toolDefinitions = buildToolDefinitions();

    agentImpl = new Agent({
      model: 'gpt-4',
      systemPrompt: systemPrompt,
      tools: toolDefinitions,
    });

    console.log('✅ Copilot Agent initialized successfully');
    return agentImpl;
  } catch (error) {
    console.warn(`⚠️  Copilot SDK not available (${error.message})`);
    console.log('📝 Using fallback agent implementation');
    return createFallbackAgent();
  }
}

/**
 * Fallback agent implementation (when SDK not available)
 */
function createFallbackAgent() {
  const systemPromptPath = path.join(__dirname, 'systemPrompt.md');
  const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

  return {
    systemPrompt: systemPrompt,
    tools: buildToolDefinitions(),
    isLegacy: true,
    
    async run(message, conversationHistory = []) {
      console.log('[Fallback Agent] Processing:', message);
      return {
        text: message,
        toolCalls: [],
        conversationHistory: conversationHistory,
      };
    },
  };
}

/**
 * Run agent with user message
 * @param {object} agent - Agent instance
 * @param {string} userMessage - User input message
 * @param {Array} conversationHistory - Previous conversation turns (optional)
 * @returns {Promise<{text: string, toolCalls: Array, toolResults: Array}>}
 */
export async function runAgent(agent, userMessage, conversationHistory = []) {
  console.log('\n🧠 [Agent Thinking]');
  console.log('User:', userMessage);
  if (!agent) {
    throw new Error('Agent not initialized');
  }

  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    // Call agent with message and get response
    let response;

    if (agent.isLegacy) {
      // Fallback implementation
      response = {
        text: `Processing: ${userMessage}`,
        toolCalls: [],
      };
    } else if (typeof agent.run === 'function') {
      // Native Copilot Agent
      response = await agent.run(userMessage, conversationHistory);
    } else {
      // Generic agent interface
      response = await callAgent(agent, messages);
    }

    // Process tool calls if any
    const toolResults = [];
    console.log('🔧 Tool Calls:', response.toolCalls);


    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        try {
          const result = await executeTool(toolCall.name, toolCall.input);
          toolResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            result: result,
          });
        } catch (error) {
          toolResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            error: error.message,
          });
        }
      }
    }
    console.log('🤖 Agent Reply:', response.text);

    return {
      text: response.text || '',
      toolCalls: response.toolCalls || [],
      toolResults: toolResults,
      conversationHistory: messages,
    };
  } catch (error) {
    console.error('❌ Agent error:', error.message);
    throw new Error(`Agent execution failed: ${error.message}`);
  }
}

/**
 * Call generic agent interface
 */
async function callAgent(agent, messages) {
  if (agent.isLegacy) {
    return {
      text: messages[messages.length - 1].content,
      toolCalls: [],
    };
  }

  // This would be specific to the actual Agent SDK implementation
  // Adjust based on actual Copilot SDK API
  return {
    text: 'Agent response pending implementation',
    toolCalls: [],
  };
}

/**
 * Create agent with custom configuration
 * @param {object} config - Configuration object
 * @returns {Promise<object>} Configured agent
 */
export async function createAgentWithConfig(config = {}) {
  const agent = await createAgent();

  if (!agent) {
    throw new Error('Failed to create agent');
  }

  // Merge custom config if provided
  if (config.systemPrompt) {
    agent.systemPrompt = config.systemPrompt;
  }

  if (config.model) {
    agent.model = config.model;
  }

  if (config.maxTokens) {
    agent.maxTokens = config.maxTokens;
  }

  return agent;
}

/**
 * Create conversation context
 */
export function createConversationContext(userId) {
  return {
    userId: userId,
    messages: [],
    lastActivity: Date.now(),
    
    addMessage(role, content) {
      this.messages.push({ role, content });
      this.lastActivity = Date.now();
    },

    getHistory() {
      return this.messages;
    },

    reset() {
      this.messages = [];
    },
  };
}
