import { callMcpTool } from './mcpClient.js';

/**
 * Tool adapter: read file from project
 * @param {string} filePath - File path to read
 * @returns {Promise<{content: string, size: number}>}
 */
export async function readFile(filePath) {
  try {
    const result = await callMcpTool('read_file', { path: filePath });
    return {
      success: true,
      content: result.content || result,
      size: (result.content || result).length,
      path: filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: filePath,
    };
  }
}

/**
 * Tool adapter: write file to project
 * @param {string} filePath - File path to write
 * @param {string} content - File content
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function writeFile(filePath, content) {
  try {
    const result = await callMcpTool('write_file', { 
      path: filePath,
      content: content,
    });
    return {
      success: true,
      message: `File written successfully: ${filePath}`,
      path: filePath,
      size: content.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: filePath,
    };
  }
}

/**
 * Tool adapter: search files by pattern
 * @param {string} pattern - Search pattern
 * @param {string} fileGlob - File glob pattern (optional)
 * @returns {Promise<{matches: Array, count: number}>}
 */
export async function searchFiles(pattern, fileGlob = '*.*') {
  try {
    const result = await callMcpTool('search_files', {
      pattern: pattern,
      fileGlob: fileGlob,
    });
    return {
      success: true,
      matches: result.matches || result,
      count: (result.matches || result).length,
      pattern: pattern,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      pattern: pattern,
      matches: [],
      count: 0,
    };
  }
}

/**
 * Tool adapter: generate code diff
 * @param {string} projectPath - Project path
 * @param {string} requirement - User requirement
 * @returns {Promise<{diff: string, analysis: string}>}
 */
export async function generateCodeDiff(projectPath, requirement) {
  try {
    const result = await callMcpTool('generate_code_diff', {
      projectPath: projectPath,
      requirement: requirement,
    });
    return {
      success: true,
      diff: result.diff || result,
      analysis: result.analysis || '',
      projectPath: projectPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      projectPath: projectPath,
      diff: '',
    };
  }
}

/**
 * Tool adapter: apply code diff/patch
 * @param {string} projectPath - Project path
 * @param {string} diff - Diff content
 * @returns {Promise<{success: boolean, message: string, filesModified: Array}>}
 */
export async function applyCodeDiff(projectPath, diff) {
  try {
    const result = await callMcpTool('apply_code_diff', {
      projectPath: projectPath,
      diff: diff,
    });
    return {
      success: true,
      message: result.message || 'Diff applied successfully',
      filesModified: result.filesModified || result.files || [],
      projectPath: projectPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      projectPath: projectPath,
      filesModified: [],
    };
  }
}

/**
 * Tool adapter: analyze change plan
 * @param {string} projectPath - Project path
 * @param {string} requirement - User requirement
 * @returns {Promise<{plan: string, steps: Array, riskAssessment: string}>}
 */
export async function analyzeChangePlan(projectPath, requirement) {
  try {
    const result = await callMcpTool('analyze_change_plan', {
      projectPath: projectPath,
      requirement: requirement,
    });
    return {
      success: true,
      plan: result.plan || result,
      steps: result.steps || [],
      riskAssessment: result.riskAssessment || 'Low',
      projectPath: projectPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      projectPath: projectPath,
      plan: '',
      steps: [],
    };
  }
}

/**
 * Tool adapter: list files in directory
 * @param {string} dirPath - Directory path
 * @param {boolean} recursive - List recursively
 * @returns {Promise<{files: Array, count: number}>}
 */
export async function listFiles(dirPath, recursive = false) {
  try {
    const result = await callMcpTool('list_files', {
      path: dirPath,
      recursive: recursive,
    });
    return {
      success: true,
      files: result.files || result,
      count: (result.files || result).length,
      directory: dirPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      directory: dirPath,
      files: [],
      count: 0,
    };
  }
}

/**
 * Tool adapter: get file metadata
 * @param {string} filePath - File path
 * @returns {Promise<{exists: boolean, size: number, modified: string}>}
 */
export async function getFileInfo(filePath) {
  try {
    const result = await callMcpTool('get_file_info', {
      path: filePath,
    });
    return {
      success: true,
      exists: true,
      size: result.size || 0,
      modified: result.modified || result.mtime || '',
      path: filePath,
    };
  } catch (error) {
    return {
      success: false,
      exists: false,
      error: error.message,
      path: filePath,
    };
  }
}

/**
 * Build tool definitions for Copilot Agent
 * @returns {Array} Array of tool definitions in Agent-compatible format
 */
export function buildToolDefinitions() {
  return [
    {
      name: 'read_file',
      description: 'Read content from a file in the project directory',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to read',
          },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'write_file',
      description: 'Write or update content in a file (use for code modifications)',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to write',
          },
          content: {
            type: 'string',
            description: 'File content to write',
          },
        },
        required: ['filePath', 'content'],
      },
    },
    {
      name: 'search_files',
      description: 'Search for files or patterns across the project',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Search pattern (regex or text)',
          },
          fileGlob: {
            type: 'string',
            description: 'File glob pattern (e.g., "*.js", "src/**/*.ts")',
          },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'generate_code_diff',
      description: 'Generate a code diff based on user requirement',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to the project directory',
          },
          requirement: {
            type: 'string',
            description: 'User requirement or change description',
          },
        },
        required: ['projectPath', 'requirement'],
      },
    },
    {
      name: 'apply_code_diff',
      description: 'Apply a code diff/patch to the project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to the project directory',
          },
          diff: {
            type: 'string',
            description: 'Diff content to apply',
          },
        },
        required: ['projectPath', 'diff'],
      },
    },
    {
      name: 'analyze_change_plan',
      description: 'Analyze and create a change plan for a requirement',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to the project directory',
          },
          requirement: {
            type: 'string',
            description: 'User requirement description',
          },
        },
        required: ['projectPath', 'requirement'],
      },
    },
    {
      name: 'list_files',
      description: 'List files in a directory',
      inputSchema: {
        type: 'object',
        properties: {
          dirPath: {
            type: 'string',
            description: 'Directory path to list',
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to list recursively',
            default: false,
          },
        },
        required: ['dirPath'],
      },
    },
    {
      name: 'get_file_info',
      description: 'Get file metadata (size, modified time, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file',
          },
        },
        required: ['filePath'],
      },
    },
  ];
}

/**
 * Execute tool call from Agent
 * @param {string} toolName - Tool name
 * @param {object} toolInput - Tool input parameters
 * @returns {Promise<any>} Tool result
 */
export async function executeTool(toolName, toolInput) {
  switch (toolName) {
    case 'read_file':
      return readFile(toolInput.filePath);
    case 'write_file':
      return writeFile(toolInput.filePath, toolInput.content);
    case 'search_files':
      return searchFiles(toolInput.pattern, toolInput.fileGlob);
    case 'generate_code_diff':
      return generateCodeDiff(toolInput.projectPath, toolInput.requirement);
    case 'apply_code_diff':
      return applyCodeDiff(toolInput.projectPath, toolInput.diff);
    case 'analyze_change_plan':
      return analyzeChangePlan(toolInput.projectPath, toolInput.requirement);
    case 'list_files':
      return listFiles(toolInput.dirPath, toolInput.recursive);
    case 'get_file_info':
      return getFileInfo(toolInput.filePath);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
