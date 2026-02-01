/**
 * Formatter utilities
 */

export function formatRequirementResult(result) {
  if (!result) return 'No result';
  
  if (typeof result === 'string') {
    return result;
  }

  if (result.error) {
    return `❌ Error: ${result.error}`;
  }

  if (result.message) {
    return result.message;
  }

  return JSON.stringify(result, null, 2);
}

export function splitLongMessage(text, maxLength = 4000) {
  if (!text || text.length <= maxLength) {
    return [text || '(empty)'];
  }

  const messages = [];
  let currentMessage = '';

  const lines = text.split('\n');

  for (const line of lines) {
    if ((currentMessage + line).length > maxLength) {
      if (currentMessage) {
        messages.push(currentMessage);
        currentMessage = '';
      }

      if (line.length > maxLength) {
        // Split very long lines
        for (let i = 0; i < line.length; i += maxLength) {
          messages.push(line.substring(i, i + maxLength));
        }
      } else {
        currentMessage = line;
      }
    } else {
      currentMessage += (currentMessage ? '\n' : '') + line;
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}
