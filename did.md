# D-ID Integration Planning

## Overview
Integration of D-ID's animation API as an enhancement to our AI responses. When a user sends an `/ai_weillmikael` command with an image, we'll:
1. Generate the AI response and TTS audio (using existing flow)
2. Use the provided image + generated audio to create an animated video
3. Fall back to standard TTS if no image or if D-ID fails

## Current System Integration Points
- OpenAI GPT-4 for response generation
- S3 for file storage (already handling images)
- Fish.audio for text-to-speech
- Socket.io for real-time updates
- Existing aiAudioMessage.ts for TTS fallback
- Message attachment system already in place ✅
- Socket-based real-time updates for messages ✅
- Video file handling already configured ✅

## Technical Requirements

### Command Flow
```bash
# Flow:
/ai_weillmikael [message]              
   → Generate AI response
   → Convert to audio using TTS
   → If image attached:
       → Send image + audio to D-ID
       → Return animated video
   → If no image:
       → Return standard audio response
```

### Message Flow Integration
```typescript
// Existing message structure we can extend
interface MessageData {
  content: string;
  authorId: string;
  attachments?: {
    create: {
      url: string;
      type: string;
      name: string;
    }
  }
}
```

### D-ID API Integration
```typescript
// Core interfaces implemented
interface CreateTalkRequest {
  source_url: string;
  script: {
    type: 'text' | 'audio';
    audio_url?: string;
    input?: string;
  };
  config?: {
    stitch: boolean;  // Keep full image context
  };
}
```

1. Command Processing
   - Check for attached image
   - If no image → use existing aiAudioMessage.ts flow
   - If image present → proceed with D-ID flow

2. D-ID Flow (only if image present)
   - Use existing S3 system (already supports video)
   - Validate face detection
   - Store image URL

3. Response Generation
   - Use existing OpenAI integration
   - Generate audio using existing TTS system
   - Pass to D-ID

4. Animation Process
   - Send to D-ID API
   - Monitor progress
   - Return video URL

## Implementation Plan

### Phase 1: Basic Setup
- [x] D-ID API client
- [x] Image capture component
- [ ] Integration with aiAudioMessage.ts:
  - [ ] Extract audio URL from message
  - [ ] Pass to D-ID client
  - [ ] Handle video response
- [ ] Message handling:
  - [ ] Detect image in AI commands
  - [ ] Route to D-ID flow if image present
  - [ ] Fall back to TTS if needed

### Phase 2: Enhanced Features
- [ ] Usage tracking (5-min trial)
- [ ] Retry logic

### Phase 3: Polish
- [ ] Analytics integration
- [ ] User preferences

## Technical Considerations

### Storage
- Use existing S3 setup
- Video retention policy
- Cleanup strategy
- Reuse existing audio files

### Rate Limiting
- Track trial usage
- Queue system
- Concurrent requests
- Fallback strategy when limits reached

### Error Handling
- Image validation
- API failures
- Processing timeouts
- Network issues
- Graceful degradation to TTS

## Resources
- [D-ID API Docs](https://docs.d-id.com/)
- [Image Requirements](https://docs.d-id.com/docs/image-requirements)
- [Best Practices](https://docs.d-id.com/docs/best-practices)

## Questions to Resolve
1. Video storage duration?
2. Trial usage tracking method?
3. Queue priority system?
4. Error notification approach?
5. When should we force TTS fallback?
6. Should we cache video results?

## Next Steps
1. Integrate D-ID client with message flow
2. Add face detection before sending to D-ID
3. Handle D-ID API responses in real-time
4. Add progress tracking for video generation
