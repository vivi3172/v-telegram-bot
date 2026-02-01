import TelegramBot from 'node-telegram-bot-api';
import { createConversationContext } from '../agent/createAgent.js';
import { runAgent } from '../agent/runAgent.js';
import { formatRequirementResult, splitLongMessage } from '../formatter.js';
import { sessionManager } from '../sessionManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

  // Get config file path
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const configPath = path.join(path.dirname(path.dirname(__dirname)), 'projects.config.json');

  /**
   * Get or create conversation context
   */
  function getConversation(userId) {
    console.log(`🔍 Retrieving conversation for user ${userId}`);
    if (!conversations.has(userId)) {
      conversations.set(userId, createConversationContext(userId));
    }
    return conversations.get(userId);
  }

  /**
   * Save project to projects.config.json
   */
  function saveProjectToConfig(alias, projectPath, description = '') {
    try {
      let config = { presets: [] };

      // Read existing config if it exists
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(configData);
      }

      // Check if project already exists
      const existingIndex = config.presets.findIndex(p => p.alias === alias);

      if (existingIndex >= 0) {
        // Update existing project
        config.presets[existingIndex] = {
          alias,
          path: projectPath,
          description: description || config.presets[existingIndex].description || '',
        };
        console.log(`✏️ Updated project in config: ${alias}`);
      } else {
        // Add new project
        config.presets.push({
          alias,
          path: projectPath,
          description: description || '',
        });
        console.log(`✅ Added project to config: ${alias}`);
      }

      // Write back to config file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error(`❌ Error saving project to config: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle /start command
   */
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const conversation = getConversation(userId);
    conversation.reset();

    const message = `🚀 *Bot 服務已啟動！*

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

    try {
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
      console.log(`🚀 /start message sent to chat ${chatId}`);

      // Auto-show project list if projects are available
      const userSession = sessionManager.getUserSession(userId);
      if (Object.keys(userSession.projectAliases).length > 0) {
        setTimeout(() => {
          sendProjectListMessage(chatId, bot, userSession);
        }, 500);
      }
    } catch (error) {
      console.error(`❌ Failed to send /start message: ${error.message}`);
    }
  });

  /**
   * Handle /copilot ping diagnostic command
   */
  bot.onText(/^\/copilot\s+ping$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    bot.sendChatAction(chatId, 'typing');

    const userSession = sessionManager.getUserSession(userId);
    const projectPath = userSession.activeProjectAlias
      ? userSession.projectAliases[userSession.activeProjectAlias]
      : 'No project selected';

    try {
      const result = await runAgent(agent, 'What is 2 + 2?', projectPath);
      bot.sendMessage(
        chatId,
        `✅ Copilot CLI Diagnostic\n\n\`\`\`\n${result.text}\n\`\`\``,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('❌ Copilot ping error:', error.message);
      bot.sendMessage(
        chatId,
        `❌ Copilot CLI Error\n\n\`\`\`\n${error.message}\n\`\`\``,
        { parse_mode: 'Markdown' }
      );
    }
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
      bot.sendMessage(
        chatId,
        `📌 *已選擇專案：${args}*\n\n現在您可以開始輸入需求，我會幫助您進行代碼變更、分析或重構！\n\n例如：\n• "添加 TypeScript 支持"\n• "重構此函數以提高可讀性"\n• "生成代碼差異"`,
        { parse_mode: 'Markdown' }
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

      const trimmedAlias = alias.trim();
      userSession.projectAliases[trimmedAlias] = projectPath;
      
      // Save to projects.config.json
      const saved = saveProjectToConfig(trimmedAlias, projectPath);

      if (saved) {
        bot.sendMessage(
          chatId,
          `✅ 專案已註冊：${trimmedAlias}\n路徑：${projectPath}\n\n📝 已自動保存到 projects.config.json`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(
          chatId,
          `⚠️ 專案已新增到會話，但無法保存到配置檔案。\n別名：${trimmedAlias}\n路徑：${projectPath}`,
          { parse_mode: 'Markdown' }
        );
      }
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
      // Get active project path
      const projectPath = userSession.activeProjectAlias
        ? userSession.projectAliases[userSession.activeProjectAlias]
        : '';

      // Send processing reminder message
      bot.sendMessage(
        chatId,
        `⚙️ *正在處理您的需求...*\n\n🤖 AI 助手正在進行分析和修改，請稍候 ⏳`,
        { parse_mode: 'Markdown' }
      );

      // Run agent with project context
      console.log(`\n💬 [User ${userId}] ${userMessage.substring(0, 100)}`);
      const agentResponse = await runAgent(agent, userMessage, projectPath);
      console.log(`🤖 [Agent Response] ${agentResponse.text.substring(0, 100)}`);
      // Add to conversation history
      conversation.addMessage('user', userMessage);
      conversation.addMessage('assistant', agentResponse.text);

      // Send response
      const responseLines = splitLongMessage(agentResponse.text, 4000);

      for (const line of responseLines) {
        const wrappedLine = `\`\`\`\n${line}\n\`\`\``;
        bot.sendMessage(chatId, wrappedLine, { parse_mode: 'Markdown' });
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
        bot.sendMessage(
          chatId,
          `📌 *已選擇專案：${projectAlias}*\n\n現在您可以開始輸入需求，我會幫助您進行代碼變更、分析或重構！\n\n例如：\n• "添加 TypeScript 支持"\n• "重構此函數以提高可讀性"\n• "生成代碼差異"`,
          { parse_mode: 'Markdown' }
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
 * Send project list as inline buttons
 */
function sendProjectList(chatId, bot, userSession) {
  sendProjectListMessage(chatId, bot, userSession);
}

/**
 * Send project setup prompt
 */
function sendProjectSetPrompt(chatId, bot) {
  const message = `➕ *加入新專案*

請按照以下格式發送您的項目信息：

\`/project set alias=/path/to/project\`

例如：
\`/project set myapp=C:\\Users\\Project\\MyApp\`

*提示：*
• 別名：用於識別項目的簡短名稱
• 路徑：項目在您電腦上的完整路徑`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Send help menu
 */
function sendHelpMenu(chatId, bot) {
  const message = `📖 *使用幫助*

*可用功能：*

*1. /project list*
查看所有已註冊的項目並快速切換

*2. /project use <別名>*
切換至指定項目
例：\`/project use myapp\`

*3. /project set <別名>=<路徑>*
註冊新項目
例：\`/project set myapp=C:\\Users\\Project\\MyApp\`

*4. /start*
顯示啟動菜單

*發送任何消息*
直接與 AI 助手互動，描述您想要的代碼變更`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
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
    const message = `🚀 *Bot 服務已啟動！*

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
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
    console.log(`🚀 Startup message sent to chat ${chatId}`);

    // Auto-show project list if projects are available
    // npm start啟動時如果要自動帶出我的專案列表，請解除下面註解
    // const userId = parseInt(chatId, 10);
    // const userSession = sessionManager.getUserSession(userId);
    // if (Object.keys(userSession.projectAliases).length > 0) {
    //   setTimeout(() => {
    //     sendProjectListMessage(chatId, bot, userSession);
    //   }, 500);
    // }
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

  bot.sendMessage(chatId, '📁 *我的專案*\n\n請點擊按鈕選擇要使用的專案：', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}
