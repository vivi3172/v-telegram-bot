import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { callMcpTool, closeMcpServer } from './mcpClient.js';
import { formatRequirementResult, splitLongMessage } from './formatter.js';
import { sessionManager } from './sessionManager.js';
import { t } from './locales.js';
import fs from 'fs';
import path from 'path';

// 載入環境變數
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const NOTIFY_ON_STARTUP = process.env.NOTIFY_ON_STARTUP === 'true';
const NOTIFY_USER_ID = process.env.NOTIFY_USER_ID;

if (!BOT_TOKEN) {
  console.error(t('warnings.configError'));
  process.exit(1);
}

// 初始化 bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// 啟動提示
console.log(t('console.botStarting'));

// 初始化預設項目和用戶會話
function initializePresetProjects() {
  try {
    const configPath = path.join(process.cwd(), 'projects.config.json');
    if (!fs.existsSync(configPath)) {
      console.log(t('warnings.presetsNotFound'));
      return;
    }

    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const presets = configData.presets || [];
    
    if (presets.length === 0) {
      console.log(t('warnings.noPresetsInConfig'));
      return;
    }

    // 保存預設項目信息供後續使用
    global.presetProjects = presets;
    
    console.log(t('console.presetsLoaded', { count: presets.length }));
    presets.forEach((preset) => {
      console.log(t('console.presetAdded', { alias: preset.alias, path: preset.path }));
    });

    // 如果啟用了啟動通知，將預設項目添加到用戶會話
    if (NOTIFY_ON_STARTUP && NOTIFY_USER_ID) {
      const userId = parseInt(NOTIFY_USER_ID);
      const userSession = sessionManager.getUserSession(userId);
      
      // 添加預設項目到用戶會話
      presets.forEach((preset) => {
        userSession.projectAliases[preset.alias] = preset.path;
      });
      
      // 設置第一個預設項目為活躍項目
      if (presets.length > 0 && !userSession.activeProjectAlias) {
        userSession.activeProjectAlias = presets[0].alias;
        console.log(t('console.activeProjectSet', { alias: presets[0].alias }));
      }
      
      console.log(t('console.presetsAddedToSession', { count: presets.length }));
    }
  } catch (error) {
    console.error('❌ Error initializing preset projects:', error.message);
  }
}

// 發送項目列表菜單給用戶（啟動時）
async function sendProjectListToUser(userId) {
  try {
    const session = sessionManager.getUserSession(userId);
    const aliases = Object.keys(session.projectAliases);

    if (aliases.length === 0) {
      const message = '📁 您還沒有設定任何專案\n\n' +
                     '請點擊下方按鈕加入專案：';

      const keyboard = [
        [
          {
            text: t('mainMenu.projectButton'),
            callback_data: 'menu_project_list',
          },
          {
            text: t('mainMenu.addProjectButton'),
            callback_data: 'menu_project_set',
          },
        ],
        [
          {
            text: t('mainMenu.helpButton'),
            callback_data: 'menu_help',
          },
        ],
      ];

      await bot.sendMessage(userId, message, {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });

      console.log(`✅ Sent menu to user ${userId}`);
      return;
    }

    // 如果有項目，直接顯示項目列表
    const inlineKeyboard = aliases.map((alias) => {
      const isActive = alias === session.activeProjectAlias ? '✓ ' : '';
      return [
        {
          text: `${isActive}${alias}`,
          callback_data: `project_use_${alias}`,
        },
      ];
    });

    // 添加菜單導航按鈕
    inlineKeyboard.push([
      {
        text: '➕ 加入新專案',
        callback_data: 'menu_project_set',
      },
    ]);
    inlineKeyboard.push([
      {
        text: '📖 查看幫助',
        callback_data: 'menu_help',
      },
    ]);

    const message = `🚀 Bot 服務已啟動！

📁 我的專案：

請點擊按鈕選擇要使用的專案：`;

    await bot.sendMessage(userId, message, {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });

    console.log(`✅ Sent project list menu to user ${userId}`);
  } catch (error) {
    console.error('❌ Error sending project list:', error.message);
  }
}

// 發送視覺化菜單給用戶
async function sendMenuToUser(userId) {
  try {
    const welcomeMessage = `${t('startup.title')}

${t('startup.welcome')}

${t('startup.description')}

${t('startup.promptAction')}`;

    const menuKeyboard = [
      [
        {
          text: t('mainMenu.projectButton'),
          callback_data: 'menu_project_list',
        },
        {
          text: t('mainMenu.addProjectButton'),
          callback_data: 'menu_project_set',
        },
      ],
      [
        {
          text: t('mainMenu.helpButton'),
          callback_data: 'menu_help',
        },
      ],
    ];

    await bot.sendMessage(userId, welcomeMessage, {
      reply_markup: {
        inline_keyboard: menuKeyboard,
      },
    });

    console.log(`✅ 啟動菜單已發送給用戶 ${userId}`);
  } catch (error) {
    console.error('❌ 發送啟動菜單出錯：', error.message);
  }
}

// 處理收到的訊息
bot.on('message', (msg) => {
  handleMessage(msg);
});

// 處理回調查詢（按鈕點擊）
bot.on('callback_query', (query) => {
  handleCallbackQuery(query);
});

// 監聽 bot 就緒事件
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// 延遲執行初始化，確保 bot 完全就緒
setTimeout(async () => {
  initializePresetProjects();
  
  // 如果啟用了啟動通知，發送項目列表菜單給指定用戶
  if (NOTIFY_ON_STARTUP && NOTIFY_USER_ID) {
    console.log('\n' + t('console.sendingStartupNotification'));
    await sendProjectListToUser(parseInt(NOTIFY_USER_ID));
  } else {
    console.log('\n' + t('console.usersCanUseStart'));
  }
  
  console.log(t('console.botReady'));
}, 1000);

// 訊息處理邏輯
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  try {
    // 處理 /req 指令
    if (userMessage.startsWith('/req ')) {
      const requirementText = userMessage.slice(5).trim();

      if (!requirementText) {
        await bot.sendMessage(chatId, t('reqCommand.needsText'));
        return;
      }

      // 向使用者顯示處理中訊息
      const processingMsg = await bot.sendMessage(
        chatId,
        t('reqCommand.analyzing'),
      );

      try {
        // 呼叫 MCP Tool
        const result = await callMcpTool('structure_client_requirement', {
          requirementText,
        });

        // 格式化結果為可讀文字
        const formattedResult = formatRequirementResult(result);

        // 分割長訊息（Telegram 限制 4096 字元）
        const messages = splitLongMessage(formattedResult);

        // 發送分割後的訊息
        for (const message of messages) {
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        }

        // 刪除處理中的訊息
        try {
          await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (e) {
          // 刪除失敗不影響流程
        }
      } catch (error) {
        console.error('MCP Tool Error:', error);
        await bot.sendMessage(
          chatId,
          t('reqCommand.analyzeFailed', { error: error.message }),
        );
      }
      return;
    }

    // 處理 /project 指令
    if (userMessage.startsWith('/project')) {
      await handleProjectCommand(msg);
      return;
    }

    // 處理 /change 指令
    if (userMessage.startsWith('/change ')) {
      await handleChangeCommand(msg);
      return;
    }

    // 處理 /dry-run 指令
    if (userMessage === '/dry-run') {
      await handleDryRunCommand(msg);
      return;
    }

    // 處理 /apply 指令
    if (userMessage === '/apply') {
      await handleApplyCommand(msg);
      return;
    }

    // 處理 /cancel 指令
    if (userMessage === '/cancel') {
      await handleCancelCommand(msg);
      return;
    }

    // 處理 /pick 指令
    if (userMessage.startsWith('/pick ')) {
      await handlePickCommand(msg);
      return;
    }

    // 處理 /start 指令
    if (userMessage === '/start') {
      const welcomeMessage = t('startup.start_message');

      // 構建菜單按鈕
      const menuKeyboard = [
        [
          {
            text: t('mainMenu.projectButton'),
            callback_data: 'menu_project_list',
          },
          {
            text: t('mainMenu.addProjectButton'),
            callback_data: 'menu_project_set',
          },
        ],
        [
          {
            text: t('mainMenu.helpButton'),
            callback_data: 'menu_help',
          },
        ],
      ];

      await bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
          inline_keyboard: menuKeyboard,
        },
      });
      return;
    }

    // 處理 /help 指令
    if (userMessage === '/help') {
      const helpMessage = t('helpMenu.fullGuide');
      await bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
      return;
    }

    // 其他訊息進行 echo
    await bot.sendMessage(chatId, userMessage);
  } catch (error) {
    console.error('Error in handleMessage:', error);
    await bot.sendMessage(chatId, t('messaging.processingError'));
  }
}

/**
 * 處理 /project 指令
 */
async function handleProjectCommand(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userMessage = msg.text;

  const parts = userMessage.split(' ');
  const subCommand = parts[1];

  try {
    if (subCommand === 'set') {
      // /project set <alias> <path>
      if (parts.length < 4) {
        await bot.sendMessage(
          chatId,
          t('projectCommands.invalidFormat'),
        );
        return;
      }

      const alias = parts[2];
      const path = parts.slice(3).join(' ');

      const result = sessionManager.setProject(userId, alias, path);
      await bot.sendMessage(chatId, result.message);
    } else if (subCommand === 'use') {
      // /project use <alias>
      if (parts.length < 3) {
        await bot.sendMessage(
          chatId,
          t('projectCommands.invalidUseFormat'),
        );
        return;
      }

      const alias = parts[2];
      const result = sessionManager.useProject(userId, alias);
      await bot.sendMessage(chatId, result.message);
    } else if (subCommand === 'list') {
      // /project list - 使用按鈕界面顯示
      const session = sessionManager.getUserSession(userId);
      const aliases = Object.keys(session.projectAliases);

      if (aliases.length === 0) {
        await bot.sendMessage(chatId, t('projectCommands.listNotSet'));
        return;
      }

      // 建立按鈕清單
      const inlineKeyboard = aliases.map((alias) => {
        const path = session.projectAliases[alias];
        const isActive = alias === session.activeProjectAlias ? '✓ ' : '';
        return [
          {
            text: `${isActive}${alias}`,
            callback_data: `project_use_${alias}`,
          },
        ];
      });

      // 添加選項說明
      let message = '📁 可用的專案\n\n';
      message += '點擊按鈕直接切換專案：\n';

      await bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } else {
      await bot.sendMessage(
        chatId,
        t('projectCommands.unknownSubcommand'),
      );
    }
  } catch (error) {
    console.error('Project command error:', error);
    await bot.sendMessage(chatId, t('projectCommands.commandError'));
  }
}

/**
 * 處理 /change 指令
 */
async function handleChangeCommand(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userMessage = msg.text;

  try {
    // 檢查是否已選擇專案
    const projectResult = sessionManager.getActiveProject(userId);
    if (!projectResult.success) {
      await bot.sendMessage(chatId, projectResult.message);
      return;
    }

    // 提取需求文字
    const requirementText = userMessage.slice(8).trim();
    if (!requirementText) {
      await bot.sendMessage(
        chatId,
        t('changeCommand.needsRequirement'),
      );
      return;
    }

    // 獲取或初始化 chat session
    const chatSession = sessionManager.getChatSession(userId, chatId);

    // 檢查是否已有進行中的流程
    if (chatSession.lastStep !== 'idle') {
      await bot.sendMessage(
        chatId,
        t('changeCommand.flowInProgress'),
      );
      return;
    }

    // 向使用者顯示處理中訊息
    const processingMsg = await bot.sendMessage(
      chatId,
      t('changeCommand.requirementAnalyzing'),
    );

    // 統一整理需求文字
    const requirement = requirementText || chatSession.requirement;
    if (!requirement) {
      await bot.sendMessage(
        chatId,
        '❗請先輸入需求內容再執行指令'
      );
      return;
    }

    // 存儲需求文字到 session
    chatSession.requirement = requirement;

    try {
      // 呼叫 MCP Tool: analyze_change_plan
      const result = await callMcpTool('analyze_change_plan', {
        projectPath: projectResult.path,
        requirement: requirement,
      });

      console.log('📝 /change 收到的 result:', JSON.stringify(result, null, 2).substring(0, 300));

      // 解析 MCP 回應
      let planData = result;
      if (result.content && Array.isArray(result.content) && result.content[0]) {
        const contentText = result.content[0].text;
        if (typeof contentText === 'string') {
          try {
            planData = JSON.parse(contentText);
            console.log('✅ 成功解析 content[0].text 中的 JSON');
          } catch (e) {
            console.warn('⚠️  無法解析 content[0].text');
            planData = result;
          }
        }
      }

      // 處理結果
      if (planData.success) {
        // 儲存到 chat session
        chatSession.projectPath = projectResult.path;
        chatSession.changePlan = planData;
        chatSession.lastStep = 'analyzed';

        console.log(`✅ 已存儲 changePlan 至 chatId: ${chatId}, userId: ${userId}`);

        // 組建回覆訊息（純文字，不用 Markdown - 修正問題1）
        let output = '';
        output += `📁 專案：${projectResult.alias}\n\n`;

        // 需求摘要
        output += '📋 需求摘要\n';
        if (planData.summary) {
          output += `${planData.summary}\n\n`;
        } else {
          output += `${requirement}\n\n`;
        }

        // 推測修改範圍
        output += '📂 推測修改範圍\n';
        if (planData.files && Array.isArray(planData.files) && planData.files.length > 0) {
          planData.files.forEach((file) => {
            output += `• ${file}\n`;
          });
        } else if (planData.modules && Array.isArray(planData.modules) && planData.modules.length > 0) {
          planData.modules.forEach((module) => {
            output += `• ${module}\n`;
          });
        } else {
          output += '(詳細內容將在 /dry-run 時顯示)\n';
        }
        output += '\n';

        // 複雜度評估
        if (planData.estimatedComplexity) {
          output += `📊 複雜度: ${planData.estimatedComplexity}\n\n`;
        }

        // 下一步提示
        output += '💡 下一步\n';
        output += '使用 /dry-run 命令預覽將要進行的修改\n';
        output += '請勿直接使用 /apply，務必先預覽';

        // 發送訊息（純文字，不設定 parse_mode - 修正問題1）
        await bot.sendMessage(chatId, output);

        // 刪除處理中的訊息
        try {
          await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (e) {
          // 刪除失敗不影響流程
        }
      } else {
        // 分析失敗（修正問題3：不丟原文給 Telegram）
        console.error('❌ MCP analyze_change_plan 失敗:', JSON.stringify(planData, null, 2));
        
        // 只給用戶簡短安全訊息
        const errorMsg = '❌ MCP 分析失敗，請查看 server log';
        await bot.sendMessage(chatId, errorMsg);
      }
    } catch (error) {
      // 修正問題3：MCP 呼叫錯誤時，詳細內容只 console.error
      console.error('❌ MCP Tool Error:', error.message, error.stack);
      
      // 只給用戶簡短安全訊息
      await bot.sendMessage(
        chatId,
        '❌ 分析失敗，請查看 server log',
      );
    }
  } catch (error) {
    console.error('Change command error:', error);
    await bot.sendMessage(chatId, t('changeCommand.commandError'));
  }
}

// 處理 bot 的錯誤
bot.on('error', (error) => {
  console.error('🚨 Bot error:', error);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n🛑 Bot shutting down...');
  bot.stopPolling();
  closeMcpServer();
  process.exit(0);
});

/**
 * 處理 /dry-run 指令
 */
async function handleDryRunCommand(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // 檢查是否已選擇專案
    const projectResult = sessionManager.getActiveProject(userId);
    if (!projectResult.success) {
      await bot.sendMessage(chatId, projectResult.message);
      return;
    }

    // 獲取 chat session
    const chatSession = sessionManager.getChatSession(userId, chatId);

    // 【修正問題1】檢查 session 中是否有 projectPath
    const projectPath = chatSession.projectPath || projectResult.path;
    if (!projectPath) {
      await bot.sendMessage(
        chatId,
        t('projectSession.selectProject'),
      );
      return;
    }

    // 前置條件檢查
    if (chatSession.lastStep !== 'analyzed') {
      const statusMsg = t('dryRunCommand.needChange');
      await bot.sendMessage(chatId, statusMsg);
      return;
    }

    if (!chatSession.changePlan) {
      await bot.sendMessage(
        chatId,
        t('projectSession.noChangePlan'),
      );
      return;
    }

    if (!chatSession.requirement) {
      await bot.sendMessage(
        chatId,
        t('projectSession.noRequirement'),
      );
      return;
    }

    // 向使用者顯示處理中訊息
    const processingMsg = await bot.sendMessage(
      chatId,
      t('dryRunCommand.generating'),
    );

    // 統一整理需求文字
    const requirement = chatSession.requirement;
    if (!requirement) {
      await bot.sendMessage(
        chatId,
        t('projectSession.provideMissingContent'),
      );
      return;
    }

    try {
      // 【修正】呼叫 MCP Tool: generate_code_diff
      // 使用 requirement（不是 requirementText）
      const result = await callMcpTool('generate_code_diff', {
        projectPath: projectPath,
        requirement: requirement,
        dryRun: true,
      });

      console.log('📝 /dry-run 收到的 result:', JSON.stringify(result, null, 2).substring(0, 300));

      // 【修正問題3】檢查 isError 標誌
      if (result.isError) {
        console.error('❌ MCP generate_code_diff 回報錯誤:', JSON.stringify(result, null, 2));
        const errorMsg = '❌ dry-run 分析失敗，請查看 server log';
        await bot.sendMessage(chatId, errorMsg);
        
        // 刪除處理中的訊息
        try {
          await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (e) {
          // 刪除失敗不影響流程
        }
        return;
      }

      // 解析 MCP 回應
      let diffData = result;
      if (result.content && Array.isArray(result.content) && result.content[0]) {
        const contentText = result.content[0].text;
        if (typeof contentText === 'string') {
          try {
            diffData = JSON.parse(contentText);
            console.log('✅ 成功解析 content[0].text 中的 JSON');
          } catch (e) {
            console.warn('⚠️  無法解析 content[0].text');
            diffData = result;
          }
        }
      }

      // 處理結果
      if (diffData.success) {
        // 儲存 diff 到 session
        chatSession.diff = diffData.diff;
        chatSession.lastStep = 'diff_generated';

        console.log(`✅ 已生成並儲存 diff 至 chatId: ${chatId}`);

        // 組建回覆訊息（純文字）
        let output = '';
        output += '🧪 Diff 預覽\n\n';

        // 從 diff 字符串中提取已更改的檔案
        // diff 格式：--- a/path/to/file\n+++ b/path/to/file
        const changedFiles = new Set();
        const diffLines = diffData.diff.split('\n');
        diffLines.forEach((line) => {
          if (line.startsWith('---') || line.startsWith('+++')) {
            const match = line.match(/^[\-\+]{3}\s+[ab]\/(.+)$/);
            if (match && match[1]) {
              changedFiles.add(match[1]);
            }
          }
        });

        // 變更檔案清單
        if (changedFiles.size > 0) {
          output += '📝 將修改以下檔案\n';
          changedFiles.forEach((file) => {
            output += `• ${file}\n`;
          });
          output += '\n';
        }

        // diff 摘要（顯示前 500 字）
        if (diffData.diff) {
          output += '📌 變更摘要\n';
          const diffPreview = diffData.diff.substring(0, 500);
          output += `${diffPreview}${diffData.diff.length > 500 ? '\n...(省略)' : ''}\n\n`;
        }

        // 明確警告
        output += '⚠️ 重要提醒\n';
        output += '• 預覽中，尚未套用任何修改\n';
        output += '• 請確認上述修改符合您的需求\n';
        output += '• 如確認無誤，請執行 /apply 正式套用\n\n';

        // 下一步提示
        output += '💡 下一步\n';
        output += '確認修改無誤後，執行：\n';
        output += '/apply';

        // 發送訊息（純文字）
        await bot.sendMessage(chatId, output);

        // 刪除處理中的訊息
        try {
          await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (e) {
          // 刪除失敗不影響流程
        }
      } else {
        // 生成差異失敗
        console.error('❌ MCP generate_code_diff 失敗:', JSON.stringify(diffData, null, 2));
        
        // 只給用戶簡短安全訊息
        const errorMsg = '❌ dry-run 分析失敗，請查看 server log';
        await bot.sendMessage(chatId, errorMsg);
      }
    } catch (error) {
      // MCP 呼叫錯誤，詳細內容只 console.error
      console.error('❌ MCP Tool Error:', error.message, error.stack);
      
      // 只給用戶簡短安全訊息
      await bot.sendMessage(
        chatId,
        '❌ dry-run 分析失敗，請查看 server log',
      );
    }
  } catch (error) {
    console.error('Dry-run command error:', error);
    await bot.sendMessage(chatId, t('dryRunCommand.commandError'));
  }
}

/**
 * 處理 /apply 指令
 */
async function handleApplyCommand(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // 檢查是否已選擇專案
    const projectResult = sessionManager.getActiveProject(userId);
    if (!projectResult.success) {
      await bot.sendMessage(chatId, projectResult.message);
      return;
    }

    // 獲取 chat session
    const chatSession = sessionManager.getChatSession(userId, chatId);

    // 前置條件檢查
    if (chatSession.lastStep !== 'diff_generated') {
      let statusMsg = '';
      if (chatSession.lastStep === 'idle') {
        statusMsg = t('applyCommand.noChangesIdle');
      } else if (chatSession.lastStep === 'analyzed') {
        statusMsg = t('applyCommand.noChangesDiffNotReady');
      } else {
        statusMsg = t('applyCommand.noChangesOther', { status: chatSession.lastStep });
      }
      await bot.sendMessage(chatId, statusMsg);
      return;
    }

    if (!chatSession.diff) {
      await bot.sendMessage(
        chatId,
        t('applyCommand.noDiffFound'),
      );
      return;
    }

    // 向使用者顯示處理中訊息
    const processingMsg = await bot.sendMessage(
      chatId,
      t('applyCommand.applying'),
    );

    try {
      // 呼叫 MCP Tool: apply_code_diff
      // 使用 projectPath（一致的命名）
      const result = await callMcpTool('apply_code_diff', {
        projectPath: chatSession.projectPath,
        diff: chatSession.diff,
      });

      console.log('📝 /apply 收到的 result:', JSON.stringify(result, null, 2).substring(0, 300));

      // 解析 MCP 回應
      let applyData = result;
      if (result.content && Array.isArray(result.content) && result.content[0]) {
        const contentText = result.content[0].text;
        if (typeof contentText === 'string') {
          try {
            applyData = JSON.parse(contentText);
            console.log('✅ 成功解析 content[0].text 中的 JSON');
          } catch (e) {
            console.warn('⚠️  無法解析 content[0].text');
            applyData = result;
          }
        }
      }

      // 處理結果
      if (applyData.success) {
        // 組建成功訊息（純文字，不用 Markdown - 修正問題1）
        let output = '';
        output += '✅ 已成功套用修改\n\n';

        // 顯示修改的檔案清單
        if (applyData.appliedFiles && Array.isArray(applyData.appliedFiles)) {
          output += '📝 修改的檔案\n';
          applyData.appliedFiles.forEach((file) => {
            output += `• ${file}\n`;
          });
          output += '\n';
        }

        // 顯示總結訊息
        if (applyData.summary) {
          output += `📌 ${applyData.summary}\n\n`;
        }

        // 清空 session
        sessionManager.clearChatSession(userId, chatId);
        console.log(`✅ 已清空 chatId ${chatId} 的 session 狀態`);

        // 發送訊息（純文字，不設定 parse_mode - 修正問題1）
        await bot.sendMessage(chatId, output);
      } else {
        // 應用失敗（修正問題3：不丟原文給 Telegram）
        console.error('❌ MCP apply_code_diff 失敗:', JSON.stringify(applyData, null, 2));
        
        // 只給用戶簡短安全訊息
        const errorMsg = '❌ MCP 套用修改失敗，請查看 server log';
        await bot.sendMessage(chatId, errorMsg);
      }
    } catch (error) {
      // 修正問題3：MCP 呼叫錯誤時，詳細內容只 console.error
      console.error('❌ MCP Tool Error:', error.message, error.stack);
      
      // 只給用戶簡短安全訊息
      await bot.sendMessage(
        chatId,
        '❌ 套用修改失敗，請查看 server log',
      );
    }

    // 刪除處理中的訊息
    try {
      await bot.deleteMessage(chatId, processingMsg.message_id);
    } catch (e) {
      // 刪除失敗不影響流程
    }
  } catch (error) {
    console.error('Apply command error:', error);
    await bot.sendMessage(chatId, t('applyCommand.commandError'));
  }
}

/**
 * 處理 /cancel 指令
 */
async function handleCancelCommand(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // 獲取 chat session
    const chatSession = sessionManager.getChatSession(userId, chatId);

    // 檢查是否有進行中的流程
    if (chatSession.lastStep === 'idle') {
      await bot.sendMessage(
        chatId,
        t('cancelCommand.nothingToCancel'),
      );
      return;
    }

    // 清空 session
    sessionManager.clearChatSession(userId, chatId);
    console.log(`✅ 已取消 chatId ${chatId} 的流程`);

    let output = '';
    output += '✅ 已取消修改流程\n\n';
    output += '所有暫存資料已清除\n\n';
    output += '如需重新開始，請執行：\n';
    output += '/change <需求文字>';

    await bot.sendMessage(chatId, output);
  } catch (error) {
    console.error('Cancel command error:', error);
    await bot.sendMessage(chatId, t('cancelCommand.commandError'));
  }
}

/**
 * 處理 /pick 指令（已棄用）
 */
async function handlePickCommand(msg) {
  const chatId = msg.chat.id;

  try {
    const deprecatedMsg =
      '⚠️ /pick 指令已棄用\n\n' +
      '請使用新的三步工作流：\n\n' +
      '1. /change <需求文字> - 分析變更\n' +
      '2. /dry-run - 預覽差異\n' +
      '3. /apply - 應用修改\n\n' +
      '取消流程可執行 /cancel';

    await bot.sendMessage(chatId, deprecatedMsg);
  } catch (error) {
    console.error('Pick command error:', error);
    await bot.sendMessage(chatId, t('projectCommands.commandError'));
  }
}

/**
 * 處理回調查詢（按鈕點擊事件）
 */
async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const callbackData = query.data;

  try {
    // 處理菜單回調
    if (callbackData === 'menu_project_list') {
      // 顯示項目列表
      const session = sessionManager.getUserSession(userId);
      const aliases = Object.keys(session.projectAliases);

      if (aliases.length === 0) {
        let message = t('projectMenu.noProjects');

        const backButton = [
          [{ text: t('mainMenu.backButton'), callback_data: 'menu_back' }],
        ];

        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: backButton },
        });
      } else {
        // 構建項目按鈕清單
        const inlineKeyboard = aliases.map((alias) => {
          const isActive = alias === session.activeProjectAlias ? t('projectMenu.currentProject') : '';
          return [
            {
              text: `${isActive}${alias}`,
              callback_data: `project_use_${alias}`,
            },
          ];
        });

        // 添加返回按鈕
        inlineKeyboard.push([
          { text: t('mainMenu.backButton'), callback_data: 'menu_back' },
        ]);

        let message = t('projectMenu.selectProject');

        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: inlineKeyboard },
        });
      }

      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 處理加入新專案菜單
    if (callbackData === 'menu_project_set') {
      let message = t('addProjectMenu.instruction');

      // 預設項目快速按鈕
      const keyboard = [];
      if (global.presetProjects && global.presetProjects.length > 0) {
        message += '\n\n🔗 或快速加入預設項目：\n\n';
        global.presetProjects.forEach((preset) => {
          keyboard.push([
            {
              text: `📌 ${preset.alias}`,
              callback_data: `preset_load_${preset.alias}`,
            },
          ]);
        });
      }

      keyboard.push([{ text: t('mainMenu.backButton'), callback_data: 'menu_back' }]);

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'HTML',
      });

      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 處理快速加載預設項目
    if (callbackData.startsWith('preset_load_')) {
      const alias = callbackData.replace('preset_load_', '');
      const preset = global.presetProjects.find((p) => p.alias === alias);

      if (preset) {
        const result = sessionManager.setProject(userId, preset.alias, preset.path);
        if (result.success) {
          await bot.answerCallbackQuery(query.id, `✅ 已加入項目 ${alias}`, false);

          // 自動切換到該項目
          sessionManager.useProject(userId, alias);

          // 返回項目列表
          const session = sessionManager.getUserSession(userId);
          const aliases = Object.keys(session.projectAliases);

          const inlineKeyboard = aliases.map((a) => {
            const isActive = a === session.activeProjectAlias ? '✓ ' : '';
            return [
              {
                text: `${isActive}${a}`,
                callback_data: `project_use_${a}`,
              },
            ];
          });

          inlineKeyboard.push([
            { text: '◀️ 返回菜單', callback_data: 'menu_back' },
          ]);

          let message = '📁 已設定的專案\n\n';
          message += '點擊按鈕切換專案：';

          await bot.editMessageText(message, {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: { inline_keyboard: inlineKeyboard },
          });
        }
      }
      return;
    }

    // 處理查看幫助菜單
    if (callbackData === 'menu_help') {
      const helpMessage = `<b>📖 使用幫助</b>

<b>🎯 三步工作流（推薦用法）</b>

<b>1️⃣ /change &lt;需求文字&gt;</b>
分析代碼變更需求

<b>2️⃣ /dry-run</b>
預覽將進行的代碼修改

<b>3️⃣ /apply</b>
應用修改到項目

<b>🛠️ 專案管理</b>

• <b>/project list</b> - 查看/切換專案
• <b>/project set &lt;別名&gt; &lt;路徑&gt;</b> - 加入新專案

<b>⚠️ 其他命令</b>

• <b>/cancel</b> - 取消進行中流程
• <b>/start</b> - 返回主菜單`;

      const backButton = [
        [{ text: t('mainMenu.backButton'), callback_data: 'menu_back' }],
      ];

      await bot.editMessageText(helpMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: backButton },
        parse_mode: 'HTML',
      });

      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 處理返回主菜單
    if (callbackData === 'menu_back') {
      const menuMessage = t('startup.start_message');

      const menuKeyboard = [
        [
          {
            text: t('mainMenu.projectButton'),
            callback_data: 'menu_project_list',
          },
          {
            text: t('mainMenu.addProjectButton'),
            callback_data: 'menu_project_set',
          },
        ],
        [
          {
            text: t('mainMenu.helpButton'),
            callback_data: 'menu_help',
          },
        ],
      ];

      await bot.editMessageText(menuMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: menuKeyboard },
      });

      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 處理專案切換按鈕
    if (callbackData.startsWith('project_use_')) {
      const alias = callbackData.replace('project_use_', '');

      // 執行專案切換
      const result = sessionManager.useProject(userId, alias);

      if (result.success) {
        // 更新按鈕消息
        const session = sessionManager.getUserSession(userId);
        const aliases = Object.keys(session.projectAliases);

        const inlineKeyboard = aliases.map((a) => {
          const isActive = a === session.activeProjectAlias ? '✓ ' : '';
          return [
            {
              text: `${isActive}${a}`,
              callback_data: `project_use_${a}`,
            },
          ];
        });

        inlineKeyboard.push([
          { text: '◀️ 返回菜單', callback_data: 'menu_back' },
        ]);

        let message = '📁 已設定的專案\n\n';
        message += '點擊按鈕切換專案：\n\n';
        message += `✅ 已切換至：${alias}`;

        // 編輯消息
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        });

        // 發送確認通知
        await bot.answerCallbackQuery(query.id, `✅ 已切換至專案 ${alias}`, false);
      } else {
        // 發送錯誤通知
        await bot.answerCallbackQuery(query.id, result.message, true);
      }
    }
  } catch (error) {
    console.error('Callback query error:', error);
    await bot.answerCallbackQuery(query.id, '❌ 處理失敗', true);
  }
}
