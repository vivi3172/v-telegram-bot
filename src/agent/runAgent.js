/**
 * Execute agent with Copilot SDK (STREAMING SAFE VERSION + TELEGRAM INTEGRATION)
 * - Avoids sendAndWait() timeout issues
 * - Uses streaming events: assistant.message_delta + session.idle
 * - Long task support (180-300s timeout)
 * - Real-time Telegram message updates (throttled)
 * - Proper event cleanup to prevent memory leaks
 * @param {object} agent - { client, session }
 * @param {string} userMessage - User request
 * @param {string} projectPath - Active project path context
 * @param {object} bot - Telegram bot instance (optional)
 * @param {number} chatId - Telegram chat ID (optional)
 * @returns {Promise<{text: string, toolCalls: [], toolResults: []}>}
 */
export async function runAgent(agent, userMessage, projectPath = '', bot = null, chatId = null) {
  if (!agent || !agent.session) {
    throw new Error('Agent or session not initialized');
  }

  console.log('\n🧠 [Copilot SDK - Streaming Request]');
  console.log('📍 Project Path:', projectPath || '(no project)');
  console.log('💬 User Request:', userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''));

  const { session } = agent;
  const TIMEOUT_MS = 180000; // 3 minutes for long tasks
  const HEARTBEAT_INTERVAL = 5000; // Log every 5 seconds while thinking
  const TELEGRAM_THROTTLE = 2000; // Flush to Telegram every 2 seconds

  // Build composed prompt with project context
  const composed = `
  你是一位資深工程師助理。
請全部使用繁體中文回答。
請不要輸出 Plan、思考過程或步驟，只輸出最終答案。

  Project Path: ${projectPath}

User Request:
${userMessage}
`;

  return new Promise((resolve, reject) => {
    let output = '';
    let isFinished = false;
    let timeoutHandle = null;
    let heartbeatHandle = null;
    let telegramThrottleHandle = null;
    let hasStartedStreaming = false;
    let telegramMessageId = null;
    let lastTelegramUpdate = 0;
    let unsubscribeDelta = null;
    let unsubscribeIdle = null;
    let unsubscribeError = null;

    const sendToTelegram = async (text) => {
      if (!bot || !chatId) return null;

      try {
        const wrappedText = `\`\`\`\n${text}\n\`\`\``;
        const msg = await bot.sendMessage(chatId, wrappedText, { parse_mode: 'Markdown' });
        return msg.message_id;
      } catch (err) {
        console.error('❌ Telegram send error:', err.message);
        return null;
      }
    };

    const editTelegramMessage = async (messageId, text) => {
      if (!bot || !chatId || !messageId) return false;

      try {
        const wrappedText = `\`\`\`\n${text}\n\`\`\``;
        await bot.editMessageText(wrappedText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
        });
        return true;
      } catch (err) {
        if (err.message.includes('message not modified')) {
          return true; // Not an error, content is the same
        }
        console.error('❌ Telegram edit error:', err.message);
        return false;
      }
    };

    const flushTelegramBuffer = async () => {
      if (!bot || !chatId || !output || isFinished) return;

      const now = Date.now();
      if (now - lastTelegramUpdate < TELEGRAM_THROTTLE) return;

      try {
        if (!telegramMessageId) {
          // First update: send initial message
          telegramMessageId = await sendToTelegram(output);
        } else {
          // Subsequent updates: edit message
          const success = await editTelegramMessage(telegramMessageId, output);
          if (!success && telegramMessageId) {
            // Fallback: send new message if edit fails
            telegramMessageId = await sendToTelegram(output);
          }
        }
        lastTelegramUpdate = now;
      } catch (err) {
        console.error('❌ Telegram flush error:', err.message);
      }
    };

    const onDelta = (event) => {
      if (isFinished) return;

      // Log once when first chunk arrives
      if (!hasStartedStreaming) {
        hasStartedStreaming = true;
        if (heartbeatHandle) clearInterval(heartbeatHandle);
        console.log('\n🧠 Copilot started responding...');
      }

      const chunk = event?.data?.deltaContent ?? '';
      output += chunk;
      process.stdout.write(chunk); // Stream to console
    };

    const onIdle = () => {
      if (isFinished) return;
      isFinished = true;

      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (heartbeatHandle) clearInterval(heartbeatHandle);
      if (telegramThrottleHandle) clearInterval(telegramThrottleHandle);

      // Send final message to Telegram
      (async () => {
        try {
          if (bot && chatId && output) {
            if (!telegramMessageId) {
              await sendToTelegram(output);
            } else {
              await editTelegramMessage(telegramMessageId, output);
            }
          }
        } catch (err) {
          console.error('❌ Final Telegram update error:', err.message);
        }

        cleanup();
        console.log('\n✅ Copilot streaming completed');
        resolve({
          text: output || 'No response from Copilot',
          toolCalls: [],
          toolResults: [],
        });
      })();
    };

    const onError = (err) => {
      if (isFinished) return;
      isFinished = true;

      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (heartbeatHandle) clearInterval(heartbeatHandle);
      if (telegramThrottleHandle) clearInterval(telegramThrottleHandle);
      cleanup();

      reject(err);
    };

    const cleanup = () => {
      if (unsubscribeDelta) unsubscribeDelta();
      if (unsubscribeIdle) unsubscribeIdle();
      if (unsubscribeError) unsubscribeError();
    };

    // Register event listeners (on() returns unsubscribe function)
    unsubscribeDelta = session.on('assistant.message_delta', onDelta);
    unsubscribeIdle = session.on('session.idle', onIdle);
    unsubscribeError = session.on('error', onError);

    // Set timeout for long-running tasks
    timeoutHandle = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        if (heartbeatHandle) clearInterval(heartbeatHandle);
        if (telegramThrottleHandle) clearInterval(telegramThrottleHandle);
        cleanup();
        reject(new Error(`⏱️ Copilot streaming timeout after ${TIMEOUT_MS / 1000}s (is Copilot CLI responsive?)`));
      }
    }, TIMEOUT_MS);

    // Send request using streaming
    (async () => {
      try {
        console.log('📡 Sending to Copilot CLI...');

        // Start heartbeat to show we're thinking
        heartbeatHandle = setInterval(() => {
          if (!hasStartedStreaming && !isFinished) {
            console.log('⏳ Copilot thinking...');
          }
        }, HEARTBEAT_INTERVAL);

        // Start Telegram throttle timer
        if (bot && chatId) {
          telegramThrottleHandle = setInterval(flushTelegramBuffer, TELEGRAM_THROTTLE);
        }

        await session.send({
          prompt: composed,
        });
      } catch (err) {
        onError(err);
      }
    })();
  });
}

