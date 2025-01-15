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
  try {
    const messageContext = await getMessageWithContext(messageId);
    if (!messageContext) {
      throw new Error('Message not found');
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

    const document = new Document({
      pageContent: text,
      metadata: {
        message_id: messageContext.id,
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
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex: index }
    );
    await vectorStore.addDocuments([document]);

    console.log('✅ Message vectorized successfully:', messageId);
  } catch (error) {
    console.error('❌ Error vectorizing message:', error);
    // Don't throw - we don't want to break message creation if vectorization fails
  }
}

// Delete a message vector
export async function deleteMessageVector(messageId: string) {
  const index = pinecone.index(process.env.PINECONE_INDEX!);
  await index.deleteOne(messageId);
}