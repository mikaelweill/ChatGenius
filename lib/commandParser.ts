interface CommandResult {
  isCommand: boolean;
  command: string;
  prompt: string;
}

/**
 * Parses a message to check if it's an AI command
 * @param message The message to parse
 * @returns CommandResult object with parsing details
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

  // Check if message starts with /ai
  if (!trimmedMessage.startsWith('/ai')) {
    return defaultResult;
  }

  // Extract the prompt (everything after /ai)
  const prompt = trimmedMessage.slice(3).trim();
  
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