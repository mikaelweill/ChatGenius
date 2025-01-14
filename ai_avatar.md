# AI Avatar Feature Implementation Plan

## Overview
Implementation of AI-powered user avatars that can engage in conversations by mimicking user communication styles. The feature will be activated through the "/ai" command (displayed as 🤖) and will use a combination of ChatGPT, Pinecone, and Langchain for context-aware responses.

## Implementation Progress

### ✅ Phase 1 Complete
- Created `lib/commandParser.ts` with visual feedback
- Enhanced MessageInput with real-time command styling
- Set up OpenAI integration with GPT-4o mini
- Created AI_SYSTEM user in database
- Implemented basic message flow:
  - User message appears immediately with 🤖
  - AI response follows asynchronously
  - Works in both channels and DMs
- Removed API routes in favor of direct socket communication
- Added proper error handling and state management

### 🚧 Phase 2 (Current Focus)
1. Message Grounding System
   - ✅ Implement Pinecone for message vectorization
   - 🚧 Create relevance-based message retrieval
     - ✅ Basic similarity search implementation
     - ❌ Fix metadata filtering for DM/Channel separation
     - ❌ Implement proper ranking system
   - ❌ Design context window management
   - ✅ Set up background indexing of messages

2. User-Specific AI Responses
   - ❌ For DMs: Always mimic the other user
   - ❌ For Channels: 
     - Default: General AI assistant
     - Optional: Select specific user to mimic
   - ❌ Analyze and store user communication patterns

### Immediate Next Steps
1. 🔄 Fix metadata filtering in RAG system:
   ```typescript
   // Current metadata structure we need to handle:
   {
     channel_id: string | "",
     direct_chat_id: string | null,
     author_id: string,
     author_name: string,
     // ... other fields
   }
   ```

2. 🔄 Enhance context retrieval:
   - Implement proper filtering for DM vs channel messages
   - Add relevance scoring based on:
     - Message timestamp
     - Conversation thread
     - Author context

3. ⏭️ Implement user style analysis:
   - Message patterns
   - Vocabulary usage
   - Response characteristics

4. ⏭️ Add context window management:
   - Token counting
   - Context prioritization
   - Window size optimization

### ⏳ Phase 3 (Planned)
- Enhanced context management
- User style preservation
- Performance optimizations
- Analytics and monitoring

## Technical Architecture Updates

### Message Grounding Flow
1. On "/ai" command:
   - Vector search recent messages
   - Filter by:
     - DMs: Other user's messages only
     - Channels: Selected user or all messages
   - Sort by relevance and recency
   - Construct context window

2. Context Assembly:
   ```typescript
   interface MessageContext {
     recentMessages: Message[]  // Most relevant messages
     userStyle?: UserStyle     // If mimicking specific user
     channelContext?: string   // Channel topic/purpose
     messageType: 'dm' | 'channel'
     selectedUser?: string     // For channel user selection
   }
   ```

### User Style Analysis
- Store message patterns per user
- Analyze:
  - Message length
  - Vocabulary usage
  - Emoji frequency
  - Response patterns
  - Common phrases

## Technical Architecture

### Data Flow
1. Message Ingestion:
   - Websocket events capture all messages
   - Messages stored in PostgreSQL
   - Automatic vectorization of messages for Pinecone
   - Metadata tagging for user context

2. Vector Storage:
   - Single Pinecone namespace for all messages
   - Vector dimension: 1536 (OpenAI embeddings)
   - Metadata structure for efficient filtering:
     ```typescript
     {
       authorId: string
       authorName: string
       timestamp: Date
       messageType: 'text' | 'reaction' | 'file'
       channelId?: string
       directChatId?: string
       // Additional metadata for better filtering
       isDirectMessage: boolean
       participantIds: string[]  // For DMs
     }
     ```

3. Context Retrieval:
   - Hybrid search using Pinecone with metadata filters
   - Relevance scoring based on:
     - Semantic similarity
     - Time proximity
     - Conversation thread
     - Author context (using metadata filter)

## Next Steps
1. ⏭️ Implement server-side socket handling
2. ⏭️ Add rate limiting
3. ⏭️ Test basic AI responses
4. ⏭️ Add error recovery
5. ⏭️ Implement context retrieval

## Technical Challenges

### Performance Considerations
- Real-time response requirements (<2s target)
- Vector search optimization (index strategy)
- Context window management (token limits)
- Rate limiting implementation
- Caching strategy:
  - Redis for hot contexts
  - Background refresh of embeddings
  - Lazy loading of historical data

### AI Response Quality
- Personality consistency through prompt engineering
- Context relevance scoring system
- Response appropriateness filters
- Training data quality assurance
- Feedback loop mechanism

### System Architecture
- Socket integration with error recovery
- Database schema updates:
  ```prisma
  model UserPersonality {
    id        String   @id @default(cuid())
    userId    String
    embedding Json     // Store personality embedding
    metadata  Json     // Store behavioral parameters
    updatedAt DateTime @updatedAt
  }
  ```
- API endpoint design with circuit breakers
- Error handling with fallback responses

## Implementation Notes

### Message Processing Flow
```
User Input ("/ai" command) 
  → Command Parser ✅
  → Rate Limit Check ⏳
  → API Endpoint ✅
  → Context Retrieval (Pinecone/Langchain) ⏳
  → Context Merging ⏳
  → ChatGPT Processing ✅
  → Response Validation ⏳
  → Socket Broadcast ⏳
  → Real-time Update ⏳
  → Background Analytics ⏳
```

### Considerations
1. Cost management for API calls
   - Token usage monitoring
   - User quotas
   - Batch processing where possible
   - Caching strategy

2. Privacy implications
   - Message retention policies
   - User consent for AI training
   - Data anonymization
   - Access control layers

3. Rate limiting strategy
   - Per-user limits
   - Global API limits
   - Cooldown periods
   - Priority queuing

4. Error handling and fallbacks
   - Graceful degradation
   - Cached responses
   - User notifications
   - Recovery mechanisms

5. Performance optimization
   - Query optimization
   - Batch processing
   - Caching layers
   - Load balancing

6. Security Considerations
   - Input sanitization
   - Prompt injection prevention
   - User permission validation
   - API key rotation

7. Monitoring and Analytics
   - Usage patterns
   - Error rates
   - Response quality metrics
   - Performance tracking 

## Recent Progress Update (Phase 1)
- Implemented command parser for "/ai" commands with immediate visual feedback
- ✅ Set up OpenAI integration with GPT-4o mini
- ✅ Created AI_SYSTEM user in database
- ✅ Implemented basic message flow:
  - User message appears immediately
  - AI response follows asynchronously
  - Works in both channels and DMs

## Current Limitations & Insights
- Current implementation uses a generic AI_SYSTEM user
- No context awareness (each message is treated independently)
- No personality mimicking
- No message history consideration
- System-wide AI approach may not be ideal, considering:
  - User-specific AI personas might be more engaging
  - Context should be scoped to relevant conversations
  - Need to balance between immediate responses and context-aware replies

## Recent Architectural Decisions
- Decided against API routes in favor of direct socket communication
- Unified message events (planning to consolidate DM and channel message handling)
- Immediate message feedback with async AI responses 