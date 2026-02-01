import { spawn } from 'child_process';

const MCP_SERVER_PATH = 'node C:/EBM/Project/Demo/v-mcp/index.js';

// Tool-specific timeout settings (in milliseconds)
const TOOL_TIMEOUTS = {
  'generate_code_diff': 90000,    // 90 秒 - 需要兩次 Copilot 調用
  'analyze_change_plan': 45000,   // 45 秒 - 需要一次 Copilot 調用
  'apply_code_diff': 10000,       // 10 秒 - 本地檔案操作
  'default': 30000                // 30 秒 - 其他 tool
};

let mcpProcess = null;
let messageId = 1;
let pendingRequests = new Map();

/**
 * 啟動 MCP 伺服器（延遲初始化）
 */
function startMcpServer() {
  if (mcpProcess) return;

  const [nodePath, ...args] = MCP_SERVER_PATH.split(' ');
  mcpProcess = spawn(nodePath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  // 接收 stdout 回應
  mcpProcess.stdout.on('data', (data) => {
    const responseText = data.toString('utf-8');
    handleMcpResponse(responseText);
  });

  // 錯誤處理
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
 * 處理 MCP 伺服器的 stdout 回應
 */
function handleMcpResponse(responseText) {
  const lines = responseText.split('\n').filter((line) => line.trim());

  lines.forEach((line) => {
    try {
      const response = JSON.parse(line);

      if (response.id && pendingRequests.has(response.id)) {
        const { resolve, reject, timeout } = pendingRequests.get(response.id);
        clearTimeout(timeout);

        if (response.error) {
          reject(new Error(response.error.message || 'MCP Tool Error'));
        } else {
          resolve(response.result);
        }

        pendingRequests.delete(response.id);
      }
    } catch (error) {
      console.error('Failed to parse MCP response:', line);
    }
  });
}

/**
 * 呼叫 MCP Tool
 * @param {string} toolName - Tool 名稱，例如 "structure_client_requirement"
 * @param {object} args - Tool 參數，例如 { requirementText: "..." }
 * @returns {Promise} Tool 執行結果
 */
export async function callMcpTool(toolName, args) {
  return new Promise((resolve, reject) => {
    try {
      startMcpServer();

      if (!mcpProcess) {
        return reject(new Error('MCP server failed to start'));
      }

      const id = messageId++;
      const payload = {
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      };

      // 設置 timeout
      const timeout = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`MCP Tool call timeout: ${toolName}`));
      }, 60000); // 60 秒超時

      pendingRequests.set(id, { resolve, reject, timeout });

      // 發送 JSON-RPC 請求
      mcpProcess.stdin.write(JSON.stringify(payload) + '\n');
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 關閉 MCP 伺服器
 */
export function closeMcpServer() {
  if (mcpProcess) {
    mcpProcess.kill();
    mcpProcess = null;
    console.log('MCP server closed');
  }
}
