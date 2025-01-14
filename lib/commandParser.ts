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
  return message.startsWith('/ai ') || message.match(/^\/ai_[a-zA-Z0-9]+/) !== null;
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

  // Check for /ai_username format
  const userMatch = trimmedMessage.match(/^\/ai_([a-zA-Z0-9]+)\s+(.+)$/);
  if (userMatch) {
    const [_, username, prompt] = userMatch;
    return {
      isCommand: true,
      command: 'ai_user',
      prompt: prompt.trim(),
      targetUser: username
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