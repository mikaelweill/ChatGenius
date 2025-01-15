import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "langchain/document";

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

export async function vectorizeMessage(
  content: string,
  metadata: MessageMetadata
) {
  try {
    // Format message like in Python script
    const text = `
      Message: ${content}
      From: ${metadata.author_name}
      Context: ${metadata.channel_name ? `Channel: ${metadata.channel_name}` : 'Direct Message'}
      Timestamp: ${metadata.timestamp}
    `.trim();

    const document = new Document({
      pageContent: text,
      metadata
    });

    // Get vector store
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex: process.env.PINECONE_INDEX! }
    );

    // Add document
    await vectorStore.addDocuments([document]);

    console.log('✅ Message vectorized successfully:', metadata.message_id);
  } catch (error) {
    console.error('❌ Error vectorizing message:', error);
    // Don't throw - we don't want to break message creation if vectorization fails
  }
} 