import { generateSpeech } from './tts';

interface CommandResult {
  isCommand: boolean;
  command: string;
  prompt: string;
  targetUser?: string;
}

/**
 * Checks if the input should show AI command formatting
 * Only checks for "/ai " to trigger UI changes
 */
export function shouldShowAIFormatting(message: string): boolean {
  // Only show formatting when:
  // 1. "/ai " (space after ai)
  // 2. "/ai_username " (exact username match followed by space)
  if (message.startsWith('/ai ')) return true;
  
  // Match underscore-separated names (e.g., /ai_sarah_chen)
  const userMatch = message.match(/^\/ai_([a-zA-Z0-9_]+)/);
  if (!userMatch) return false;
  
  const username = userMatch[1];
  return message.charAt(message.indexOf(username) + username.length) === ' ';
}

/**
 * Parses a message to check if it's a valid AI command
 * Requires both the command and some content
 */
export function parseAICommand(message: string): CommandResult {
  // Default result
  const defaultResult: CommandResult = {
    isCommand: false,
    command: '',
    prompt: '',
    targetUser: undefined
  };

  const trimmedMessage = message.trim();

  // Match underscore-separated names
  const userMatch = trimmedMessage.match(/^\/ai_([a-zA-Z0-9_]+)\s+(.+)$/);
  if (userMatch) {
    const [_, username, prompt] = userMatch;
    return {
      isCommand: true,
      command: 'ai_user',
      prompt: prompt.trim(),
      targetUser: username  // Keep underscores in the username
    };
  }

  // Check for regular /ai command
  if (trimmedMessage.startsWith('/ai ')) {
    return {
      isCommand: true,
      command: 'ai',
      prompt: trimmedMessage.slice(4).trim(),
      targetUser: undefined
    };
  }

  return defaultResult;
}

