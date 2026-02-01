/**
 * Execute agent with Copilot SDK (STREAMING SAFE VERSION)
 * - Avoids sendAndWait() timeout issues
 * - Uses streaming events: assistant.message_delta + session.idle
 * - Long task support (180-300s timeout)
 * - Proper event cleanup to prevent memory leaks
 * @param {object} agent - { client, session }
 * @param {string} userMessage - User request
 * @param {string} projectPath - Active project path context
 * @returns {Promise<{text: string, toolCalls: [], toolResults: []}>}
 */
export async function runAgent(agent, userMessage, projectPath = '') {
  if (!agent || !agent.session) {
    throw new Error('Agent or session not initialized');
  }

  console.log('\n🧠 [Copilot SDK - Streaming Request]');
  console.log('📍 Project Path:', projectPath || '(no project)');
  console.log('💬 User Request:', userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''));

  const { session } = agent;
  const TIMEOUT_MS = 180000; // 3 minutes for long tasks (review, diff, etc.)

  // Build composed prompt with project context
  const composed = `Project Path: ${projectPath}

User Request:
${userMessage}
`;

  return new Promise((resolve, reject) => {
    let output = '';
    let isFinished = false;
    let timeoutHandle = null;

    // Event handlers
    const onDelta = (event) => {
      if (isFinished) return; // Ignore events after completion
      
      const chunk = event?.data?.deltaContent ?? '';
      output += chunk;
      process.stdout.write(chunk); // Stream to console in real-time
    };

    const onIdle = () => {
      if (isFinished) return;
      isFinished = true;

      if (timeoutHandle) clearTimeout(timeoutHandle);
      cleanup();

      console.log('\n✅ Copilot streaming completed');
      resolve({
        text: output || 'No response from Copilot',
        toolCalls: [],
        toolResults: [],
      });
    };

    const onError = (err) => {
      if (isFinished) return;
      isFinished = true;

      if (timeoutHandle) clearTimeout(timeoutHandle);
      cleanup();

      reject(err);
    };

    const cleanup = () => {
      session.off('assistant.message_delta', onDelta);
      session.off('session.idle', onIdle);
      session.off('error', onError);
    };

    // Register event listeners
    session.on('assistant.message_delta', onDelta);
    session.on('session.idle', onIdle);
    session.on('error', onError);

    // Set timeout for long-running tasks
    timeoutHandle = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        cleanup();
        reject(new Error(`⏱️ Copilot streaming timeout after ${TIMEOUT_MS / 1000}s (is Copilot CLI responsive?)`));
      }
    }, TIMEOUT_MS);

    // Send request using streaming (not sendAndWait)
    (async () => {
      try {
        console.log('📡 Sending to Copilot CLI (streaming mode)...');

        await session.send({
          prompt: composed,
        });

        console.log('📤 Request sent, waiting for response...');
      } catch (err) {
        onError(err);
      }
    })();
  });
}

