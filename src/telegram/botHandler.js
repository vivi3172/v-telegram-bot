import TelegramBot from 'node-telegram-bot-api';
import { runAgent, createConversationContext } from '../agent/createAgent.js';
import { formatRequirementResult, splitLongMessage } from '../formatter.js';
import { sessionManager } from '../sessionManager.js';

/**
 * Initialize Telegram bot handler
 * @param {string} botToken - Telegram bot token
 * @param {object} agent - Copilot Agent instance
 * @returns {TelegramBot} Initialized bot instance
 */
export function initializeBotHandler(botToken, agent) {
  const bot = new TelegramBot(botToken, { polling: true });

  // Store active conversations
  const conversations = new Map();

  /**
   * Get or create conversation context
   */
  function getConversation(userId) {
    if (!conversations.has(userId)) {
      conversations.set(userId, createConversationContext(userId));
    }
    return conversations.get(userId);
  }

  /**
   * Handle /start command
   */
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const conversation = getConversation(userId);
    conversation.reset();

    const welcomeText = `
🚀 Welcome to AI Code Refactoring Bot!

I'm powered by GitHub Copilot SDK and can help you with:
✨ Analyzing code changes
✨ Generating code diffs
✨ Applying patches safely
✨ Planning refactoring tasks

Send me a message describing what you'd like to change in your code!

Example:
"Add TypeScript support to my JavaScript project"
"Refactor this function for better readability"
"Generate a diff for the following requirement..."
    `.trim();

    bot.sendMessage(chatId, welcomeText);
  });

  /**
   * Handle /project commands (existing functionality)
   */
  bot.onText(/^\/project\s+(\w+)(?:\s+(.*))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const subcommand = match[1];
    const args = match[2] || '';

    const userSession = sessionManager.getUserSession(userId);

    if (subcommand === 'list') {
      sendProjectList(chatId, bot, userSession);
    } else if (subcommand === 'use') {
      if (!args) {
        bot.sendMessage(chatId, '❌ Please specify a project alias');
        return;
      }

      if (!userSession.projectAliases[args]) {
        bot.sendMessage(chatId, `❌ Project alias "${args}" not found`);
        return;
      }

      userSession.activeProjectAlias = args;
      const projectPath = userSession.projectAliases[args];
      bot.sendMessage(
        chatId,
        `✅ Switched to project: ${args}\nPath: ${projectPath}`
      );
    } else if (subcommand === 'set') {
      if (!args.includes('=')) {
        bot.sendMessage(chatId, '❌ Format: /project set alias=/path/to/project');
        return;
      }

      const [alias, ...pathParts] = args.split('=');
      const projectPath = pathParts.join('=').trim();

      if (!alias.trim() || !projectPath) {
        bot.sendMessage(chatId, '❌ Invalid format');
        return;
      }

      userSession.projectAliases[alias.trim()] = projectPath;
      bot.sendMessage(
        chatId,
        `✅ Project registered: ${alias.trim()}\nPath: ${projectPath}`
      );
    } else {
      bot.sendMessage(chatId, '❌ Unknown command. Use: list, use, set');
    }
  });

  /**
   * Handle all other text messages with Agent
   */
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userMessage = msg.text;

    // Skip command messages
    if (userMessage.startsWith('/')) {
      return;
    }

    // Show typing indicator
    bot.sendChatAction(chatId, 'typing');

    const conversation = getConversation(userId);
    const userSession = sessionManager.getUserSession(userId);

    try {
      // Build context-aware message
      const contextMessage = buildContextMessage(
        userMessage,
        userSession,
        conversation
      );

      // Run agent with conversation history
      const agentResponse = await runAgent(
        agent,
        contextMessage,
        conversation.getHistory()
      );

      // Add to conversation history
      conversation.addMessage('user', contextMessage);
      conversation.addMessage('assistant', agentResponse.text);

      // Send response
      const responseLines = splitLongMessage(agentResponse.text, 4000);

      for (const line of responseLines) {
        bot.sendMessage(chatId, line, { parse_mode: 'HTML' });
      }

      // Send tool execution summary if any tools were called
      if (agentResponse.toolResults && agentResponse.toolResults.length > 0) {
        const summary = formatToolResults(agentResponse.toolResults);
        bot.sendMessage(chatId, summary, { parse_mode: 'HTML' });
      }
    } catch (error) {
      console.error('❌ Error processing message:', error.message);
      bot.sendMessage(
        chatId,
        `❌ Error: ${error.message}\n\nPlease try again or check logs.`
      );
    }
  });

  /**
   * Handle callback queries from inline buttons
   */
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    bot.answerCallbackQuery(query.id);

    const userSession = sessionManager.getUserSession(userId);

    // Handle project selection buttons
    if (data.startsWith('project_use_')) {
      const projectAlias = data.replace('project_use_', '');
      if (userSession.projectAliases[projectAlias]) {
        userSession.activeProjectAlias = projectAlias;
        bot.sendMessage(
          chatId,
          `✅ Switched to: ${projectAlias}`
        );
      }
    }

    // Handle menu buttons
    if (data === 'cmd_project_list') {
      sendProjectList(chatId, bot, userSession);
    } else if (data === 'cmd_project_set') {
      sendProjectSetPrompt(chatId, bot);
    } else if (data === 'cmd_help') {
      sendHelpMenu(chatId, bot);
    }
  });

  return bot;
}

/**
 * Build context-aware message for agent
 */
function buildContextMessage(userMessage, userSession, conversation) {
  let contextMessage = userMessage;

  if (userSession.activeProjectAlias) {
    const projectPath = userSession.projectAliases[userSession.activeProjectAlias];
    contextMessage = `
Project: ${userSession.activeProjectAlias}
Path: ${projectPath}

Request: ${userMessage}
    `.trim();
  }

  return contextMessage;
}

/**
 * Send project list as inline buttons
 */
function sendProjectList(chatId, bot, userSession) {
  sendProjectListMessage(chatId, bot, userSession);
}

/**
 * Format tool execution results
 */
function formatToolResults(toolResults) {
  const summary = toolResults
    .map((result) => {
      if (result.error) {
        return `❌ ${result.toolName}: ${result.error}`;
      }
      return `✅ ${result.toolName}: Success`;
    })
    .join('\n');

  return `<b>Tool Execution:</b>\n${summary}`;
}

/**
 * Send project setup prompt
 */
function sendProjectSetPrompt(chatId, bot) {
  const message = `➕ <b>加入新專案</b>

請按照以下格式發送您的項目信息：

<code>/project set alias=/path/to/project</code>

例如：
<code>/project set myapp=C:\\Users\\Project\\MyApp</code>

<b>提示：</b>
• 別名：用於識別項目的簡短名稱
• 路徑：項目在您電腦上的完整路徑`;

  bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

/**
 * Send help menu
 */
function sendHelpMenu(chatId, bot) {
  const message = `📖 <b>使用幫助</b>

<b>可用功能：</b>

<b>1. /project list</b>
查看所有已註冊的項目並快速切換

<b>2. /project use &lt;別名&gt;</b>
切換至指定項目
例：<code>/project use myapp</code>

<b>3. /project set &lt;別名&gt;=&lt;路徑&gt;</b>
註冊新項目
例：<code>/project set myapp=C:\\Users\\Project\\MyApp</code>

<b>4. /start</b>
顯示啟動菜單

<b>發送任何消息</b>
直接與 AI 助手互動，描述您想要的代碼變更`;

  bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

/**
 * Send message to specific chat
 */
export async function sendMessage(bot, chatId, text, options = {}) {
  const lines = splitLongMessage(text, 4000);
  for (const line of lines) {
    await bot.sendMessage(chatId, line, {
      parse_mode: 'HTML',
      ...options,
    });
  }
}

/**
 * Send startup notification message with visual menu
 */
export async function sendStartupMessage(bot, chatId) {
  if (!chatId) {
    console.warn('⚠️ No chat ID provided for startup message');
    return;
  }

  try {
    const message = `🚀 <b>Bot 服務已啟動！</b>

👋 歡迎使用代碼變更智慧助手！

我是您的 AI 編碼助手，請輸入需求開始使用～`;

    const keyboard = [
      [
        {
          text: '📁 查看專案',
          callback_data: 'cmd_project_list',
        },
        {
          text: '➕ 加入新專案',
          callback_data: 'cmd_project_set',
        },
      ],
      [
        {
          text: '📖 幫助',
          callback_data: 'cmd_help',
        },
      ],
    ];

    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
    console.log(`🚀 Startup message sent to chat ${chatId}`);

    // Auto-show project list if projects are available
    const userId = parseInt(chatId, 10);
    const userSession = sessionManager.getUserSession(userId);
    if (Object.keys(userSession.projectAliases).length > 0) {
      setTimeout(() => {
        sendProjectListMessage(chatId, bot, userSession);
      }, 500);
    }
  } catch (error) {
    console.error(`❌ Failed to send startup message: ${error.message}`);
  }
}

/**
 * Internal function to send project list (for startup and menu)
 */
function sendProjectListMessage(chatId, bot, userSession) {
  const projects = Object.entries(userSession.projectAliases);

  if (projects.length === 0) {
    bot.sendMessage(
      chatId,
      '❌ No projects registered yet\n\nUse: /project set alias=/path/to/project'
    );
    return;
  }

  const keyboard = projects.map(([alias, _path]) => [
    {
      text: `${userSession.activeProjectAlias === alias ? '✓ ' : ''}${alias}`,
      callback_data: `project_use_${alias}`,
    },
  ]);

  // Add navigation buttons
  keyboard.push([
    {
      text: '➕ 加入新專案',
      callback_data: 'cmd_project_set',
    },
  ]);
  keyboard.push([
    {
      text: '📖 幫助',
      callback_data: 'cmd_help',
    },
  ]);

  bot.sendMessage(chatId, '📁 <b>我的專案</b>\n\n請點擊按鈕選擇要使用的專案：', {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}
