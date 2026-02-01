import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const MCP_SERVER_PATH = process.env.MCP_SERVER_PATH || '';

// Tool-specific timeout settings (milliseconds)
const TOOL_TIMEOUTS = {
  'generate_code_diff': 90000,
  'analyze_change_plan': 45000,
  'apply_code_diff': 10000,
  'default': 30000
};

let mcpProcess = null;
let messageId = 1;
let pendingRequests = new Map();

/**
 * Start MCP server (lazy initialization)
 */
function startMcpServer() {
  if (mcpProcess) return;

  const [nodePath, ...args] = MCP_SERVER_PATH.split(' ');
  mcpProcess = spawn(nodePath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  mcpProcess.stdout.on('data', (data) => {
    const responseText = data.toString('utf-8');
    handleMcpResponse(responseText);
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('MCP Server Error:', data.toString('utf-8'));
  });

  mcpProcess.on('error', (error) => {
    console.error('🚨 Failed to start MCP server:', error.message);
    mcpProcess = null;
  });

  console.log('✅ MCP server started');
}

/**
 * Handle MCP server response
 */
function handleMcpResponse(responseText) {
  const lines = responseText.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const id = response.id;

      if (pendingRequests.has(id)) {
        const { resolve, reject, timeout } = pendingRequests.get(id);
        clearTimeout(timeout);

        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }

        pendingRequests.delete(id);
      }
    } catch (e) {
      // Skip non-JSON lines (e.g., console logs)
    }
  }
}

/**
 * Call MCP tool with timeout
 */
export async function callMcpTool(toolName, args = {}) {
  startMcpServer();

  const id = messageId++;
  const timeout = TOOL_TIMEOUTS[toolName] || TOOL_TIMEOUTS['default'];

  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Tool "${toolName}" timed out after ${timeout}ms`));
    }, timeout);

    pendingRequests.set(id, {
      resolve,
      reject,
      timeout: timeoutHandle,
    });

    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

/**
 * Close MCP server connection
 */
export async function closeMcpServer() {
  if (mcpProcess) {
    mcpProcess.kill();
    mcpProcess = null;
  }
}

/**
 * List available MCP tools
 */
export async function listAvailableMcpTools() {
  startMcpServer();

  const id = messageId++;

  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error('Tool listing timed out'));
    }, 5000);

    pendingRequests.set(id, {
      resolve,
      reject,
      timeout: timeoutHandle,
    });

    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/list',
    };

    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}
