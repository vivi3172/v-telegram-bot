/**
 * Integration Example: Using Copilot Agent with MCP Tools
 * 
 * This file demonstrates how to:
 * 1. Initialize the Agent
 * 2. Register MCP tools
 * 3. Execute agent with tool calling
 * 4. Handle tool results
 * 5. Manage conversation context
 */

// ============================================================================
// EXAMPLE 1: Basic Agent Initialization
// ============================================================================

import { createAgent, runAgent, createConversationContext } from './src/agent/createAgent.js';

async function exampleBasicInit() {
  console.log('Example 1: Basic Agent Initialization\n');

  // Create agent with default system prompt
  const agent = await createAgent();

  if (!agent) {
    console.error('Failed to create agent');
    return;
  }

  console.log('✅ Agent created successfully');
  console.log('   Tools available:', agent.tools?.length || 'unknown');
  console.log('   Has system prompt:', !!agent.systemPrompt);
}

// ============================================================================
// EXAMPLE 2: Single Message Processing
// ============================================================================

async function exampleSingleMessage() {
  console.log('\n\nExample 2: Process Single Message\n');

  const agent = await createAgent();
  const userMessage = 'Generate a TypeScript interface for a user object';

  const response = await runAgent(agent, userMessage, []);

  console.log('User:', userMessage);
  console.log('Agent response:', response.text);
  console.log('Tools called:', response.toolCalls.length);
  
  if (response.toolResults.length > 0) {
    console.log('Tool results:');
    response.toolResults.forEach((result) => {
      console.log(`  - ${result.toolName}: ${result.error ? 'ERROR' : 'SUCCESS'}`);
    });
  }
}

// ============================================================================
// EXAMPLE 3: Multi-Turn Conversation
// ============================================================================

async function exampleMultiTurnConversation() {
  console.log('\n\nExample 3: Multi-Turn Conversation\n');

  const agent = await createAgent();
  const conversation = createConversationContext(123); // userId: 123

  // Turn 1
  const userMsg1 = 'I want to refactor my JavaScript to TypeScript';
  console.log('Turn 1 - User:', userMsg1);

  const response1 = await runAgent(agent, userMsg1, conversation.getHistory());
  conversation.addMessage('user', userMsg1);
  conversation.addMessage('assistant', response1.text);
  console.log('Agent:', response1.text?.substring(0, 100) + '...');

  // Turn 2 (with context from turn 1)
  const userMsg2 = 'My project is in /home/user/my-project';
  console.log('\nTurn 2 - User:', userMsg2);

  const response2 = await runAgent(agent, userMsg2, conversation.getHistory());
  conversation.addMessage('user', userMsg2);
  conversation.addMessage('assistant', response2.text);
  console.log('Agent:', response2.text?.substring(0, 100) + '...');

  console.log('\nConversation history length:', conversation.getHistory().length);
}

// ============================================================================
// EXAMPLE 4: Tool Execution Flow
// ============================================================================

async function exampleToolExecution() {
  console.log('\n\nExample 4: Tool Execution Flow\n');

  const agent = await createAgent();

  // Request that would trigger tool calls
  const userMessage = `
    Read the file src/index.js
    Then search for all async functions
    Generate a diff to add TypeScript types
  `;

  console.log('Processing complex request with multiple tool calls...\n');

  const response = await runAgent(agent, userMessage, []);

  console.log('Tools called by Agent:');
  response.toolCalls.forEach((call, i) => {
    console.log(`  ${i + 1}. ${call.name}`);
    console.log(`     Input:`, JSON.stringify(call.input).substring(0, 60) + '...');
  });

  console.log('\nTool Results:');
  response.toolResults.forEach((result) => {
    const status = result.error ? '❌' : '✅';
    console.log(`  ${status} ${result.toolName}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  console.log('\nFinal Response:');
  console.log(response.text?.substring(0, 200) + '...');
}

// ============================================================================
// EXAMPLE 5: Error Handling
// ============================================================================

async function exampleErrorHandling() {
  console.log('\n\nExample 5: Error Handling\n');

  const agent = await createAgent();

  // Request with invalid parameters
  const userMessage = 'Read from /nonexistent/file.js and process it';

  try {
    const response = await runAgent(agent, userMessage, []);

    console.log('Agent handled error gracefully');
    console.log('Response:', response.text?.substring(0, 150) + '...');

    // Check for tool errors
    const failedTools = response.toolResults.filter((r) => r.error);
    if (failedTools.length > 0) {
      console.log('\nFailed tools:');
      failedTools.forEach((result) => {
        console.log(`  - ${result.toolName}: ${result.error}`);
      });
    }
  } catch (error) {
    console.error('Agent error caught:', error.message);
  }
}

// ============================================================================
// EXAMPLE 6: Project Context
// ============================================================================

async function exampleProjectContext() {
  console.log('\n\nExample 6: Project Context\n');

  const agent = await createAgent();

  // Message with project context
  const projectContext = {
    projectAlias: 'demo',
    projectPath: 'C:\\EBM\\Project\\Demo\\v-mcp',
  };

  const userMessage = `
    Project: ${projectContext.projectAlias}
    Path: ${projectContext.projectPath}
    
    Request: Add error handling to all async functions
  `;

  const response = await runAgent(agent, userMessage, []);

  console.log('✅ Processing with project context');
  console.log('   Project:', projectContext.projectAlias);
  console.log('   Path:', projectContext.projectPath);
  console.log('\nAgent understood context and responded accordingly');
  console.log('Response length:', response.text?.length, 'characters');
}

// ============================================================================
// EXAMPLE 7: Building Tool Definitions
// ============================================================================

import { buildToolDefinitions } from './src/tools/mcpTools.js';

function exampleToolDefinitions() {
  console.log('\n\nExample 7: Tool Definitions\n');

  const tools = buildToolDefinitions();

  console.log(`Total tools available: ${tools.length}\n`);

  tools.forEach((tool) => {
    console.log(`📌 ${tool.name}`);
    console.log(`   Description: ${tool.description}`);
    const requiredParams = tool.inputSchema.required || [];
    console.log(`   Required parameters: ${requiredParams.join(', ')}`);
  });
}

// ============================================================================
// EXAMPLE 8: Session Management
// ============================================================================

import { sessionManager } from './src/sessionManager.js';

function exampleSessionManagement() {
  console.log('\n\nExample 8: Session Management\n');

  const userId = 123;

  // Register projects for user
  sessionManager.registerProject(userId, 'demo', 'C:\\path\\to\\demo');
  sessionManager.registerProject(userId, 'prod', 'C:\\path\\to\\prod');

  console.log('Registered projects for user:', userId);

  // Set active project
  sessionManager.setActiveProject(userId, 'demo');
  console.log('Active project:', 'demo');

  // Get active project
  const activeProject = sessionManager.getActiveProject(userId);
  console.log('Retrieved active project:', activeProject);

  // Get user session
  const session = sessionManager.getUserSession(userId);
  console.log('User session projects:', Object.keys(session.projectAliases));
}

// ============================================================================
// EXAMPLE 9: Telegram Integration
// ============================================================================

async function exampleTelegramIntegration() {
  console.log('\n\nExample 9: Telegram Bot Integration\n');

  import { initializeBotHandler } from './src/telegram/botHandler.js';

  // This would be called in index.js
  // const bot = initializeBotHandler(BOT_TOKEN, agent);

  console.log('Bot handler would be initialized with:');
  console.log('  ✅ Message handlers for commands');
  console.log('  ✅ Callback query handlers for buttons');
  console.log('  ✅ Project selection buttons');
  console.log('  ✅ Message routing to Agent');
  console.log('  ✅ Response formatting and splitting');
}

// ============================================================================
// EXAMPLE 10: Complete Workflow
// ============================================================================

async function exampleCompleteWorkflow() {
  console.log('\n\nExample 10: Complete Workflow\n');

  console.log('Step 1: Create agent');
  const agent = await createAgent();
  console.log('✅ Agent ready');

  console.log('\nStep 2: Initialize user session');
  sessionManager.registerProject(456, 'myproject', '/home/user/myproject');
  console.log('✅ Project registered');

  console.log('\nStep 3: Create conversation context');
  const conversation = createConversationContext(456);
  console.log('✅ Conversation context created');

  console.log('\nStep 4: Process first message');
  const msg1 = 'Show me the structure of my project';
  const response1 = await runAgent(agent, msg1, conversation.getHistory());
  conversation.addMessage('user', msg1);
  conversation.addMessage('assistant', response1.text);
  console.log(`✅ Processed: "${msg1.substring(0, 30)}..."`);

  console.log('\nStep 5: Process follow-up message');
  const msg2 = 'Now add TypeScript types to the main file';
  const response2 = await runAgent(agent, msg2, conversation.getHistory());
  conversation.addMessage('user', msg2);
  conversation.addMessage('assistant', response2.text);
  console.log(`✅ Processed: "${msg2.substring(0, 30)}..."`);

  console.log('\nStep 6: Display results');
  console.log('Conversation length:', conversation.getHistory().length, 'messages');
  console.log('Tools utilized:', response2.toolCalls.length, 'calls');
  console.log('Tool results:', response2.toolResults.filter((r) => !r.error).length, 'successful');

  console.log('\n✅ Complete workflow executed successfully!');
}

// ============================================================================
// Run Examples
// ============================================================================

async function runAllExamples() {
  console.log('═'.repeat(80));
  console.log('v-telegram-bot: Copilot SDK Integration Examples');
  console.log('═'.repeat(80));

  // await exampleBasicInit();
  // await exampleSingleMessage();
  // await exampleMultiTurnConversation();
  // await exampleToolExecution();
  // await exampleErrorHandling();
  // await exampleProjectContext();
  // exampleToolDefinitions();
  // exampleSessionManagement();
  // await exampleTelegramIntegration();
  // await exampleCompleteWorkflow();

  console.log('\n' + '═'.repeat(80));
  console.log('Note: Examples are commented out to avoid running during import');
  console.log('Uncomment the example you want to run in runAllExamples()');
  console.log('═'.repeat(80));
}

// Export functions for testing
export {
  exampleBasicInit,
  exampleSingleMessage,
  exampleMultiTurnConversation,
  exampleToolExecution,
  exampleErrorHandling,
  exampleProjectContext,
  exampleToolDefinitions,
  exampleSessionManagement,
  exampleTelegramIntegration,
  exampleCompleteWorkflow,
  runAllExamples,
};
