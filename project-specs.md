ChatGenius Product Requirements Document Core Features Authentication

Email/password login Google OAuth Session persistence

Messaging

Real-time message sending/receiving Channel & DM support Thread replies Emoji reactions File attachments Message search

Organization

Channel creation/management Direct messaging User presence indicators Online/offline status User profiles

Technical Stack

Next.js 14 with App Router Prisma ORM PostgreSQL Vercel deployment Pusher for real-time features NextAuth.js for authentication Uploadthing for file uploads shadcn/ui components

Data Models prismaCopymodel User { id String @id @default(cuid()) name String? email String? @unique image String? createdAt DateTime @default(now()) updatedAt DateTime @updatedAt

messages Message[] channels Channel[] directChats DirectChat[] reactions Reaction[] }

model Channel { id String @id @default(cuid()) name String description String? createdAt DateTime @default(now())

messages Message[] members User[] }

model DirectChat { id String @id @default(cuid()) createdAt DateTime @default(now())

participants User[] messages Message[] }

model Message { id String @id @default(cuid()) content String createdAt DateTime @default(now()) updatedAt DateTime @updatedAt

author User @relation(fields: [authorId], references: [id]) authorId String

channel Channel? @relation(fields: [channelId], references: [id]) channelId String?

directChat DirectChat? @relation(fields: [directChatId], references: [id]) directChatId String?

parentMessage Message? @relation("ThreadReplies", fields: [parentId], references: [id]) parentId String? replies Message[] @relation("ThreadReplies")

reactions Reaction[] attachments Attachment[] }

model Reaction { id String @id @default(cuid()) emoji String

user User @relation(fields: [userId], references: [id]) userId String

message Message @relation(fields: [messageId], references: [id]) messageId String }

model Attachment { id String @id @default(cuid()) url String type String name String

message Message @relation(fields: [messageId], references: [id]) messageId String }