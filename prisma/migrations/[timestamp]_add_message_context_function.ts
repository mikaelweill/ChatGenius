import { Prisma } from '@prisma/client';

export default Prisma.sql`
CREATE OR REPLACE FUNCTION public.get_messages_with_context()
RETURNS TABLE (
    id TEXT,
    content TEXT,
    "authorId" TEXT,
    "channelId" TEXT,
    "directChatId" TEXT,
    "createdAt" TIMESTAMP(3),
    author_name TEXT,
    channel_name TEXT,
    reactions JSONB,
    attachments JSONB,
    reply_count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        m."authorId",
        m."channelId",
        m."directChatId",
        m."createdAt",
        u.name as author_name,
        c.name as channel_name,
        COALESCE((SELECT jsonb_agg(r.emoji) FROM "Reaction" r WHERE r."messageId" = m.id), '[]'::jsonb),
        COALESCE((SELECT jsonb_agg(jsonb_build_object('name', a.name, 'type', a.type)) 
                 FROM "Attachment" a WHERE a."messageId" = m.id), '[]'::jsonb),
        COALESCE((SELECT COUNT(*) FROM "Message" r WHERE r."replyToId" = m.id), 0)
    FROM "Message" m
    LEFT JOIN "User" u ON m."authorId" = u.id
    LEFT JOIN "Channel" c ON m."channelId" = c.id;
END;
$$;
`; 