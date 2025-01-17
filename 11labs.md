# Eleven Labs Integration Planning

## Overview
Enhance ChatGenius with multilingual capabilities and voice cloning features using Eleven Labs API. This adds two main features:
1. Multilingual AI responses with native-sounding voices
2. Voice cloning for personalized responses

## Feature 1: Multilingual AI Responses

### Command Flow
```bash
# Standard AI command (stays in English):
/ai explain quantum computing

# Multilingual commands (translates + speaks in target language):
/ai explain quantum computing in spanish
/ai what's the weather like? in french

# Note: Only commands ending with "in [language]" trigger translation
```

### Technical Flow
1. Command Processing
   - Parse language from command
   - If no "in [language]" suffix → process as normal English AI response
   - Extract main message
   - Validate supported languages

2. Response Generation
   - Use OpenAI to generate response in target language
   - Select appropriate Eleven Labs voice for language
   - Generate speech in target language
   - Return audio message

### Implementation Notes
- Keep separate from weillmikael (which uses Fish.audio)
- Store language-specific voice IDs
- Handle language detection/validation
- Support fallback to English

### Implementation Details

#### 1. Command Parser Enhancement
```typescript
// Example command structure
interface LanguageCommand {
  message: string;
  language: string;
  originalCommand: string;
}

// Parse "/ai explain quantum in spanish"
function parseLanguageCommand(command: string): LanguageCommand {
  const match = command.match(/^\/ai\s+(.+?)\s+in\s+(\w+)$/);
  return {
    message: match[1],        // "explain quantum"
    language: match[2],       // "spanish"
    originalCommand: command
  };
}
```

#### 2. OpenAI Integration
```typescript
// Enhance existing getChatCompletion
async function getChatCompletion(
  message: string, 
  language: string = 'english'
): Promise<string> {
  const systemPrompt = `You are a helpful assistant. 
    Respond in ${language}. Ensure the response is natural 
    and culturally appropriate for ${language} speakers.`;
  
  // Rest of OpenAI logic...
}
```

#### 3. Eleven Labs Voice Mapping
```typescript
// Voice configuration
const LANGUAGE_VOICES = {
  spanish: 'voice_id_for_spanish',
  french: 'voice_id_for_french',
  // Add more languages...
} as const;

type SupportedLanguage = keyof typeof LANGUAGE_VOICES;

function getVoiceId(language: string): string {
  return LANGUAGE_VOICES[language as SupportedLanguage] || 
         LANGUAGE_VOICES.english; // Fallback
}
```

#### 4. Message Flow
```typescript
async function handleMultilingualMessage(command: string) {
  // 1. Parse command
  const { message, language } = parseLanguageCommand(command);
  
  // 2. Generate response in target language
  const response = await getChatCompletion(message, language);
  
  // 3. Convert to speech using appropriate voice
  const voiceId = getVoiceId(language);
  const audioContent = await elevenLabsClient.generateSpeech(
    response, 
    voiceId
  );
  
  // 4. Create message with audio attachment
  return createAudioMessage({
    content: response,
    audio: audioContent,
    language,
    voiceId
  });
}
```

#### 5. Database Updates
```prisma
// Add to schema.prisma
model Message {
  // Existing fields...
  language    String?
  voiceId     String?
}
```

#### 6. Error Handling
```typescript
const SUPPORTED_LANGUAGES = new Set([
  'english',
  'spanish',
  'french',
  // Add more...
]);

function validateLanguage(language: string): boolean {
  return SUPPORTED_LANGUAGES.has(language.toLowerCase());
}
```

## Feature 2: Voice Clone Responses

### Command Flow
```bash
# Two possible approaches:
1. Send voice message + text to repeat
2. Record sample once, store voice ID for future use
```

### Technical Flow
1. Voice Sample Processing
   - Upload voice recording to S3
   - Send to Eleven Labs for voice cloning
   - Store voice ID for user

2. Response Generation
   - Generate text response with OpenAI
   - Use cloned voice to generate speech
   - Return personalized audio message

### Technical Requirements
1. Voice Sample Requirements
   - Minimum length: 1-3 minutes
   - Clear audio quality
   - Background noise handling

2. Storage Considerations
   - Voice model storage
   - Sample audio storage
   - User preferences in Prisma

## Plan of Attack

### Step 1: Basic Infrastructure (Foundation)
1. Environment Setup
   - [ ] Add Eleven Labs API key to .env
   - [ ] Create 11labs.ts client (similar to did.ts structure)
   - [ ] Test basic API connectivity

2. Command Parser Enhancement
   - [ ] Add language detection to commandParser.ts
   - [ ] Create language validation system
   - [ ] Add language suggestions/autocomplete

### Step 2: Voice System Setup
1. AI Voice Selection
   - [ ] Select/create one distinctive AI voice
   - [ ] Test voice in multiple languages
   - [ ] Verify personality consistency

2. Basic Integration
   - [ ] Create simple text-to-speech function
   - [ ] Test same voice across different languages
   - [ ] Integrate with existing message system

### Step 3: OpenAI Integration
1. Translation System
   - [ ] Enhance OpenAI prompts for language support
   - [ ] Ensure personality consistency across languages
   - [ ] Test translation quality
   - [ ] Verify cultural appropriateness

2. Full Flow Integration
   - [ ] Connect OpenAI → Eleven Labs → Message system
   - [ ] Add error handling
   - [ ] Add fallback to English

### Step 4: Testing & Polish
1. Quality Assurance
   - [ ] Test all supported languages
   - [ ] Verify voice consistency across languages
   - [ ] Test error scenarios

2. User Experience
   - [ ] Add language selection UI hints
   - [ ] Add loading states
   - [ ] Add error messages

### Success Metrics
- Command parsing accuracy > 95%
- Translation quality check
- Voice consistency across languages
- System response time < 5s
- Personality consistency check

### Language Support (v1)
Start with top 3-4 languages:
- Spanish
- French
- German
- (Optional) Japanese
Note: Same AI voice/personality for all languages

### Testing Strategy
1. Unit Tests
   - Command parsing
   - Language detection
   - Voice mapping

2. Integration Tests
   - Full message flow
   - Error handling
   - Fallback scenarios

## Implementation Plan

### Phase 1: Basic Setup
- [x] Add Eleven Labs client (11labs.ts created)
- [x] Configure environment variables (API key added)
- [x] Create voice selection system (AI_SYSTEM uses Eleven Labs)
- [x] Add language parsing to command system

### Phase 2: Multilingual Support
- [ ] Integrate with OpenAI for translations
- [ ] Map languages to voice IDs
- [x] Add language validation (in commandParser.ts)
- [ ] Create multilingual message flow

### Phase 3: Voice Cloning
- [ ] Add voice sample processing
- [ ] Implement voice cloning flow
- [ ] Store user voice preferences
- [ ] Create personalized response flow

## Questions to Resolve
1. Voice model retention policy?
2. Language support scope?
3. Voice sample quality requirements?
4. Storage implications?
5. Rate limiting strategy?

## Resources
- [Eleven Labs API Docs](https://docs.elevenlabs.io/api-reference)
- [Voice Cloning Guide](https://docs.elevenlabs.io/guides/voice-cloning)
- [Supported Languages](https://docs.elevenlabs.io/languages) 