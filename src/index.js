import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAgent } from './agent/createAgent.js';
import { initializeBotHandler, sendStartupMessage } from './telegram/botHandler.js';
import { closeMcpServer } from './tools/mcpClient.js';
import { sessionManager } from './sessionManager.js';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Validation
if (!BOT_TOKEN) {
  console.error('❌ Error: BOT_TOKEN is not set in .env file');
  process.exit(1);
}

/**
 * Initialize preset projects
 */
function initializePresetProjects() {
  try {
    const configPath = path.join(path.dirname(__dirname), 'projects.config.json');
    if (!fs.existsSync(configPath)) {
      console.log('⚠️  projects.config.json not found');
      return;
    }

    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const presets = configData.presets || [];

    if (presets.length === 0) {
      console.log('⚠️  No presets found in projects.config.json');
      return;
    }

    global.presetProjects = presets;
    console.log(`\n📁 Loaded ${presets.length} preset projects:`);
    presets.forEach((preset) => {
      console.log(`  ✅ ${preset.alias} → ${preset.path}`);
    });

    // Load presets to admin user session
    if (TELEGRAM_ADMIN_CHAT_ID) {
      const adminId = parseInt(TELEGRAM_ADMIN_CHAT_ID, 10);
      const userSession = sessionManager.getUserSession(adminId);
      
      presets.forEach((preset) => {
        userSession.projectAliases[preset.alias] = preset.path;
      });

      // Set first project as active
      if (presets.length > 0 && !userSession.activeProjectAlias) {
        userSession.activeProjectAlias = presets[0].alias;
        console.log(`  🎯 Set active project: ${presets[0].alias}`);
      }

      console.log(`  📌 Added ${presets.length} projects to admin session`);
    }
  } catch (error) {
    console.warn(`⚠️  Error loading presets: ${error.message}`);
  }
}

/**
 * Main bootstrap function
 */
async function bootstrap() {
  let agent = null;

  try {
    console.log('🚀 Starting v-telegram-bot with Copilot SDK Client...\n');

    // Initialize preset projects
    initializePresetProjects();

    // Create Copilot Client
    console.log('\n🤖 Initializing Copilot CLI Client...');
    agent = await createAgent();

    if (!agent || !agent.session) {
      throw new Error('Failed to initialize Copilot client');
    }

    // Initialize Telegram bot
    console.log('📱 Initializing Telegram Bot...');
    const bot = initializeBotHandler(BOT_TOKEN, agent);

    console.log('\n✅ Bot started successfully!');
    console.log('📡 Listening for messages...\n');

    // Send startup notification
    if (TELEGRAM_ADMIN_CHAT_ID) {
      await sendStartupMessage(bot, parseInt(TELEGRAM_ADMIN_CHAT_ID, 10));
    } else {
      console.log('💡 TELEGRAM_ADMIN_CHAT_ID not set - skipping startup notification');
    }

    // Graceful shutdown
    const cleanup = async () => {
      console.log('\n\n🛑 Shutting down gracefully...');
      
      // Stop Copilot client if available
      if (agent?.client?.stop) {
        try {
          await agent.client.stop();
          console.log('✅ Copilot client stopped');
        } catch (error) {
          console.warn(`⚠️  Error stopping Copilot client: ${error.message}`);
        }
      }

      // Close MCP server if available
      try {
        await closeMcpServer();
      } catch (error) {
        console.warn(`⚠️  Error closing MCP server: ${error.message}`);
      }

      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error) {
    console.error('❌ Bootstrap error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Start application
bootstrap();
