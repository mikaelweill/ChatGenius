# D-ID Integration Planning

## Overview
Integration of D-ID's animation API as a simple enhancement to our robust message system. Leveraging our existing file handling, TTS, and attachment infrastructure, we only need to add the D-ID API integration layer.

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
# Two possible flows:
/ai_weillmikael [message]              # → Standard TTS response
/ai_weillmikael [message] + [image]    # → Animated video response
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

### Phase 1: Basic Setup (Simplified)
- [ ] D-ID API client (core addition needed)
- [ ] Face detection validation
- [ ] Connect to existing message flow

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
