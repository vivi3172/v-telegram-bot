import { CopilotClient } from '@github/copilot-sdk';

/**
 * Create and initialize Copilot CLI client with session
 * @returns {Promise<{client: CopilotClient, session: object}>} Agent object with client and session
 */
export async function createAgent() {
  let client = null;

  try {
    console.log('🤖 Initializing Copilot CLI Client...');
    
    // Create Copilot client
    client = new CopilotClient();
    
    // Start client connection to Copilot CLI
    console.log('📡 Starting Copilot CLI connection...');
    await client.start();
    console.log('✅ Copilot CLI connected');
    
    // Create session with streaming enabled for long tasks
    console.log('🔄 Creating streaming session...');
    const session = await client.createSession({
      model: 'gpt-5-mini',
      streaming: true,
    });

    if (!session) {
      throw new Error('Failed to create session');
    }

    console.log('✅ Copilot CLI Client initialized successfully');
    console.log('📡 Model: gpt-5-mini | Streaming: disabled');
    
    return {
      client,
      session,
    };
  } catch (error) {
    console.error(`❌ Copilot SDK initialization failed: ${error.message}`);
    console.error('Error details:', error);
    throw error;
  }
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
