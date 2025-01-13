interface CommandResult {
  isCommand: boolean;
  command: string;
  prompt: string;
}

/**
 * Checks if the input should show AI command formatting
 * Only checks for "/ai " to trigger UI changes
 */
export function shouldShowAIFormatting(message: string): boolean {
  return message.startsWith('/ai ');
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
    prompt: ''
  };

  // Trim the message
  const trimmedMessage = message.trim();

  // Check if message starts with /ai followed by a space
  if (!trimmedMessage.startsWith('/ai ')) {
    return defaultResult;
  }

  // Extract the prompt (everything after /ai)
  const prompt = trimmedMessage.slice(4).trim();
  
  // If there's no prompt text, return false
  if (!prompt) {
    return defaultResult;
  }

  return {
    isCommand: true,
    command: 'ai',
    prompt
  };
} 