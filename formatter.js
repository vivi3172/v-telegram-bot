/**
 * 格式化 requirement 分析結果
 * 將 JSON 轉換成結構清楚、易於閱讀的文字格式
 */

/**
 * 將陣列轉成項目列表
 * @param {Array|string} items - 項目陣列或字串
 * @param {string} emoji - 項目前的 emoji
 * @returns {string} 格式化後的列表
 */
function formatList(items, emoji = '•') {
  if (!items) return '';
  
  const itemArray = Array.isArray(items) ? items : [items];
  return itemArray
    .filter((item) => item && item.toString().trim())
    .map((item) => `${emoji} ${item.toString().trim()}`)
    .join('\n');
}

/**
 * 遞迴搜尋物件中的第一個非空字串值（用於提取深層的文字內容）
 */
function findTextContent(obj, depth = 0) {
  if (depth > 5) return null; // 防止無限遞迴
  
  if (typeof obj === 'string' && obj.trim()) {
    return obj;
  }
  
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = findTextContent(item, depth + 1);
        if (result) return result;
      }
    } else {
      for (const value of Object.values(obj)) {
        const result = findTextContent(value, depth + 1);
        if (result) return result;
      }
    }
  }
  
  return null;
}

/**
 * 格式化需求分析結果
 * @param {Object} result - v-mcp 回傳的結果物件
 * @returns {string} 格式化後的 Telegram 訊息
 */
export function formatRequirementResult(result) {
  console.log('📝 formatter 收到 result，欄位:', Object.keys(result).join(', '));
  
  let output = '';

  // 如果結果是字串，嘗試解析為 JSON
  let data = result;
  if (typeof result === 'string') {
    try {
      data = JSON.parse(result);
    } catch (e) {
      console.log('⚠️ 無法解析 result，回傳原始字串');
      return result;
    }
  }

  // 確保 data 是物件
  if (!data || typeof data !== 'object') {
    console.log('⚠️ result 不是物件');
    return JSON.stringify(result);
  }

  // 提取內容文字（MCP 有時候會包在 content 陣列裡）
  let analysisData = data;
  
  // 第一層：嘗試從 content[0].text 提取
  if (data.content && Array.isArray(data.content) && data.content[0]) {
    console.log('🔍 偵測到 data.content 結構');
    const contentText = data.content[0].text;
    
    if (contentText) {
      if (typeof contentText === 'string') {
        try {
          analysisData = JSON.parse(contentText);
          console.log('✅ 成功從 content[0].text 解析 JSON');
        } catch (e) {
          analysisData = { raw_text: contentText };
          console.log('⚠️ content[0].text 不是 JSON，存為 raw_text');
        }
      } else if (typeof contentText === 'object') {
        analysisData = contentText;
        console.log('✅ content[0].text 是物件，直接使用');
      }
    }
  }

  // 檢查是否是 v-mcp structure_client_requirement 的回應格式
  // 此格式包含 analysisPrompt, requirementText, instructions
  if (data.analysisPrompt && data.requirementText) {
    console.log('🎯 偵測到 v-mcp structure_client_requirement 格式');
    
    // 提取原始需求
    output += '📋 *客戶原始需求*\n';
    output += `${data.requirementText}\n\n`;
    
    // 提取分析 prompt 中的結構化內容
    const prompt = data.analysisPrompt;
    
    // 解析 prompt 中的標題和內容
    const sections = parseAnalysisPrompt(prompt);
    output += sections;
    
    console.log('✅ 成功格式化 v-mcp 回應');
    return output.trim();
  }

  // 如果有 raw_text，直接返回
  if (analysisData.raw_text && Object.keys(analysisData).length === 1) {
    console.log('📝 返回 raw_text');
    return analysisData.raw_text;
  }

  console.log('🎯 開始提取標準欄位:', Object.keys(analysisData).slice(0, 5).join(', '));

  // 需求摘要
  if (analysisData.summary || analysisData.summary_cn) {
    output += '📋 *需求摘要*\n';
    output += `${analysisData.summary || analysisData.summary_cn}\n\n`;
  }

  // 功能清單
  if (analysisData.features || analysisData.features_list || analysisData.功能清單) {
    output += '🧩 *功能清單*\n';
    output += formatList(analysisData.features || analysisData.features_list || analysisData.功能清單) + '\n\n';
  }

  // 使用者故事
  if (analysisData.user_stories || analysisData.userStories || analysisData.使用者故事) {
    output += '👤 *使用者故事*\n';
    output += formatList(analysisData.user_stories || analysisData.userStories || analysisData.使用者故事) + '\n\n';
  }

  // 非功能需求
  if (analysisData.non_functional_requirements || analysisData.nfRequirements) {
    output += '⚙️ *非功能需求*\n';
    output += formatList(analysisData.non_functional_requirements || analysisData.nfRequirements) + '\n\n';
  }

  // 不確定項目 / 問題
  if (analysisData.uncertainties || analysisData.questions || analysisData.clarifications) {
    output += '❓ *不確定項目*\n';
    const uncertainties = analysisData.uncertainties || analysisData.questions || analysisData.clarifications;
    output += formatList(uncertainties) + '\n\n';
  }

  // 潛在風險
  if (analysisData.risks || analysisData.potential_risks || analysisData.潛在風險) {
    output += '⚠️ *潛在風險*\n';
    output += formatList(analysisData.risks || analysisData.potential_risks || analysisData.潛在風險) + '\n\n';
  }

  // 優先級
  if (analysisData.priority || analysisData.priorities || analysisData.優先級) {
    output += '🧭 *優先級建議*\n';
    const priorities = analysisData.priority || analysisData.priorities || analysisData.優先級;
    
    if (Array.isArray(priorities)) {
      output += formatList(priorities) + '\n\n';
    } else if (typeof priorities === 'object') {
      Object.entries(priorities).forEach(([level, items]) => {
        const itemList = Array.isArray(items) ? items : [items];
        const itemStr = itemList
          .filter((item) => item && item.toString().trim())
          .join(', ');
        if (itemStr) {
          output += `${level}: ${itemStr}\n`;
        }
      });
      output += '\n';
    }
  }

  // 預計工作量
  if (analysisData.effort || analysisData.estimated_effort) {
    output += '⏱️ *預計工作量*\n';
    output += `${analysisData.effort || analysisData.estimated_effort}\n\n`;
  }

  // 下一步行動
  if (analysisData.action_items || analysisData.nextSteps) {
    output += '✅ *下一步行動*\n';
    output += formatList(analysisData.action_items || analysisData.nextSteps) + '\n\n';
  }

  // 備註
  if (analysisData.notes || analysisData.remarks) {
    output += '📝 *備註*\n';
    output += `${analysisData.notes || analysisData.remarks}\n\n`;
  }

  // 如果沒有提取到任何內容，嘗試暴力解析
  if (!output.trim()) {
    console.log('❌ 沒有找到已知欄位，嘗試暴力解析');
    const textContent = findTextContent(analysisData);
    if (textContent && textContent !== JSON.stringify(analysisData)) {
      console.log('🎯 找到文字內容');
      output = textContent;
    } else {
      console.log('🚨 無法提取，回傳 JSON');
      output = JSON.stringify(analysisData, null, 2);
    }
  }

  console.log('✅ formatter 完成，輸出長度:', output.length);
  return output.trim();
}

/**
 * 解析 analysisPrompt 中的結構化內容
 */
function parseAnalysisPrompt(prompt) {
  if (!prompt) return '';
  
  let output = '';
  
  // 提取【需求摘要】
  const summaryMatch = prompt.match(/【需求摘要】[^【]*?([^\n\n]*(?:\n(?!【)[^\n]*)*)/);
  if (summaryMatch) {
    output += '📋 *需求摘要*\n';
    output += summaryMatch[1].trim() + '\n\n';
  }
  
  // 提取【功能清單】
  const featuresMatch = prompt.match(/【功能清單】[^【]*?([\s\S]*?)(?=【|$)/);
  if (featuresMatch) {
    const featuresText = featuresMatch[1].trim();
    if (featuresText) {
      output += '🧩 *功能清單*\n';
      output += formatPromptSection(featuresText) + '\n\n';
    }
  }
  
  // 提取【不確定項目】
  const uncertainMatch = prompt.match(/【不確定項目】[^【]*?([\s\S]*?)(?=【|$)/);
  if (uncertainMatch) {
    const uncertainText = uncertainMatch[1].trim();
    if (uncertainText) {
      output += '❓ *不確定項目*\n';
      output += formatPromptSection(uncertainText) + '\n\n';
    }
  }
  
  // 提取【建議需再確認的問題】
  const questionsMatch = prompt.match(/【建議需再確認的問題】[^【]*?([\s\S]*?)(?=【|$)/);
  if (questionsMatch) {
    const questionsText = questionsMatch[1].trim();
    if (questionsText) {
      output += '❓ *需再確認的問題*\n';
      output += formatPromptSection(questionsText) + '\n\n';
    }
  }
  
  // 提取【潛在風險區塊】
  const riskMatch = prompt.match(/【潛在風險[^】]*】[^【]*?([\s\S]*?)(?=【|$)/);
  if (riskMatch) {
    const riskText = riskMatch[1].trim();
    if (riskText) {
      output += '⚠️ *潛在風險*\n';
      output += formatPromptSection(riskText) + '\n\n';
    }
  }
  
  // 提取【優先級建議】
  const priorityMatch = prompt.match(/【優先級建議】[^【]*?([\s\S]*?)(?=【|$)/);
  if (priorityMatch) {
    const priorityText = priorityMatch[1].trim();
    if (priorityText) {
      output += '🧭 *優先級建議*\n';
      output += formatPromptSection(priorityText) + '\n\n';
    }
  }
  
  return output;
}

/**
 * 格式化 prompt 區段中的內容
 */
function formatPromptSection(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('...'))
    .map((line) => {
      // 如果行已經以 - 或 • 開頭，保留
      if (line.match(/^[\-•]/)) {
        return line;
      }
      // 否則加上 •
      if (line && !line.includes('用 ')) {
        return '• ' + line;
      }
      return line;
    })
    .join('\n');
}

/**
 * 分割長訊息適應 Telegram 限制
 * @param {string} text - 要分割的文字
 * @param {number} maxLength - 最大長度（預設 4096）
 * @returns {Array<string>} 分割後的訊息陣列
 */
export function splitLongMessage(text, maxLength = 4096) {
  if (text.length <= maxLength) {
    return [text];
  }

  const messages = [];
  let currentMessage = '';

  // 按段落分割（保持結構）
  const paragraphs = text.split('\n\n');

  for (const paragraph of paragraphs) {
    // 如果單個段落超過限制，按行分割
    if ((currentMessage + paragraph).length > maxLength) {
      if (currentMessage) {
        messages.push(currentMessage);
        currentMessage = '';
      }

      // 如果段落本身超過限制，按行分割
      if (paragraph.length > maxLength) {
        const lines = paragraph.split('\n');
        for (const line of lines) {
          if ((currentMessage + line).length > maxLength) {
            if (currentMessage) {
              messages.push(currentMessage);
            }
            currentMessage = line + '\n';
          } else {
            currentMessage += line + '\n';
          }
        }
      } else {
        currentMessage = paragraph + '\n\n';
      }
    } else {
      currentMessage += paragraph + '\n\n';
    }
  }

  if (currentMessage.trim()) {
    messages.push(currentMessage.trim());
  }

  return messages;
}
