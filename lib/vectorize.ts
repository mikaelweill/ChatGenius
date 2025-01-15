import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "langchain/document";
import { prisma } from "./prisma";

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY
});

interface MessageMetadata {
  message_id: string;
  author_id: string;
  author_name: string;
  channel_id?: string;
  channel_name?: string;
  direct_chat_id?: string;
  timestamp: Date;
  has_attachments: boolean;
  has_replies: boolean;
  source: 'chat_messages';
}

interface MessageWithContext {
  id: string;
  content: string;
  authorId: string;
  channelId: string | null;
  directChatId: string | null;
  createdAt: Date;
  author_name: string | null;
  channel_name: string | null;
  reactions: any[];
  attachments: any[];
  reply_count: number;
}

// Initialize Pinecone client once
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Get message with context using the SQL function
async function getMessageWithContext(messageId: string) {
  const [result] = await prisma.$queryRaw<MessageWithContext[]>`
    SELECT * FROM get_messages_with_context() WHERE id = ${messageId}
  `;
  return result;
}

// Use it when vectorizing
export async function vectorizeMessage(messageId: string) {
  console.log('📝 Starting vectorization for message:', messageId);
  try {
    console.log('📝 Starting vectorization for message:', messageId);
    const messageContext = await getMessageWithContext(messageId);
    
    if (!messageContext) {
      console.error('❌ Message not found for vectorization:', messageId);
      return;
    }

    // Format message like in Python script
    const text = `
      Message: ${messageContext.content}
      From: ${messageContext.author_name}
      Context: ${messageContext.channel_name ? `Channel: ${messageContext.channel_name}` : 'Direct Message'}
      Timestamp: ${messageContext.createdAt}
      ${messageContext.reactions?.length ? `Reactions: ${JSON.stringify(messageContext.reactions)}` : ''}
      ${messageContext.attachments?.length ? `Attachments: ${JSON.stringify(messageContext.attachments)}` : ''}
      ${messageContext.reply_count ? `Thread Reply Count: ${messageContext.reply_count}` : ''}
    `.trim();

    // Construct prefixed ID based on message type
    const vectorId = messageContext.channelId 
      ? `ch_${messageContext.channelId}_${messageId}`
      : `dm_${messageContext.directChatId}_${messageId}`;

    const document = new Document({
      pageContent: text,
      metadata: {
        message_id: messageId,
        author_id: messageContext.authorId,
        author_name: messageContext.author_name || '',
        channel_id: messageContext.channelId || '',
        channel_name: messageContext.channel_name || '',
        timestamp: messageContext.createdAt,
        has_attachments: messageContext.attachments?.length > 0,
        has_replies: messageContext.reply_count > 0,
        source: 'chat_messages'
      }
    });

    // Get vector store and add document
    const index = pinecone.index(process.env.PINECONE_INDEX!);
    console.log('🔍 Using Pinecone index:', process.env.PINECONE_INDEX);
    
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex: index }
    );
    
    await vectorStore.addDocuments([document], { ids: [vectorId] });
    console.log('✅ Successfully vectorized message:', messageId);
  } catch (error) {
    console.error('❌ Error vectorizing message:', error);
  }
}

// Delete all vectors for a channel
export async function deleteChannelVectors(channelId: string) {
  try {
    console.log('🗑️ Starting vector deletion for channel:', channelId);
    
    const index = pinecone.index(process.env.PINECONE_INDEX!);
    
    // Get first page of vectors
    const pageOneList = await index.listPaginated({ 
      prefix: `ch_${channelId}_` 
    });
    
    // Safely handle potentially undefined vectors
    const vectors = pageOneList.vectors || [];
    if (vectors.length > 0) {
      const vectorIds = vectors.map(vector => vector.id);
      await index.deleteMany(vectorIds);
      console.log(`✅ Deleted ${vectorIds.length} vectors from first page`);
    }

    // Get and delete subsequent pages if they exist
    let nextToken = pageOneList.pagination?.next;
    while (nextToken) {
      const nextPage = await index.listPaginated({ 
        prefix: `ch_${channelId}_`,
        paginationToken: nextToken
      });
      
      const pageVectors = nextPage.vectors || [];
      if (pageVectors.length > 0) {
        const vectorIds = pageVectors.map(vector => vector.id);
        await index.deleteMany(vectorIds);
        console.log(`✅ Deleted ${vectorIds.length} more vectors`);
      }
      
      nextToken = nextPage.pagination?.next;
    }

    console.log(`✅ Finished deleting all vectors for channel:`, channelId);
  } catch (error) {
    console.error('❌ Error deleting channel vectors:', error);
    console.error('Error details:', {
      channelId,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}