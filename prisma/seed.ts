import { PrismaClient, Channel, User } from '@prisma/client'
import { vectorizeMessage } from '../lib/vectorize';
import { Pinecone } from "@pinecone-database/pinecone";

const prisma = new PrismaClient()

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Function to clear Pinecone index
async function clearPineconeIndex() {
  try {
    console.log('🗑️ Clearing Pinecone index...');
    const index = pinecone.index(process.env.PINECONE_INDEX!);
    await index.deleteAll();
    console.log('✅ Pinecone index cleared');
  } catch (error) {
    console.error('❌ Error clearing Pinecone index:', error);
    throw error;
  }
}

const users = [
  {
    id: 'user_sarah',
    name: 'sarah_chen',
    email: 'sarah@chatgenius.local',
    status: 'online',
    isAI: false
  },
  {
    id: 'user_james',
    name: 'james_miller',
    email: 'james@chatgenius.local',
    status: 'online',
    isAI: false
  },
  {
    id: 'user_maya',
    name: 'maya_patel',
    email: 'maya@chatgenius.local',
    status: 'online',
    isAI: false
  }
]

// Add type for messages structure
type MessagesByUser = {
  sarah: string[];
  james: string[];
  maya: string[];
}

type ChannelMessages = {
  intros: MessagesByUser;
  chatter: MessagesByUser;
}

const channelMessages: ChannelMessages = {
  intros: {
    sarah: [
      "Hey everyone! 👋 Super excited to join this community! I'm Sarah, currently leading the frontend team at TechFlow. When I'm not coding in TypeScript or debugging React components, you'll find me at the climbing gym or writing technical blogs! 🧗‍♀️💻",
      "One thing I'm really passionate about is making tech more accessible to everyone. Been mentoring junior devs for the past 3 years and it's incredibly rewarding! Anyone else into mentorship? 🤝",
      "BTW, I'm working on a cool side project using AI for code review automation. Would love to bounce ideas off fellow devs here! 🤖✨",
      "Quick question for the group - what's your favorite VS Code extension? Mine's GitHub Copilot, it's like having a pair programmer 24/7! 🚀",
      "Just set up my desk with a new ergonomic keyboard and wow - game changer! Anyone else super into workspace optimization? 🖥️"
    ],
    james: [
      "Good morning, everyone. James here. I've spent the last decade working at the intersection of design and technology, currently focusing on creating intuitive user experiences for complex systems.",
      "I believe that the best products are born from a deep understanding of human behavior and meticulous attention to detail. Currently fascinated by the implications of AI on design systems.",
      "Recently completed a case study on cognitive load reduction in enterprise applications. Happy to share insights if anyone's interested in UX psychology.",
      "I find that photography and product design share many principles - composition, balance, storytelling. Would love to connect with others who blend creative pursuits with their technical work.",
      "Question for the group: How do you approach accessibility in your projects? I've been developing a color contrast methodology that I'd like to get feedback on."
    ],
    maya: [
      "heyyy fam! 🎉 maya here~ your friendly neighborhood content wizard and professional gif enthusiast ✨ can't wait to vibe with all of you!",
      "when i'm not creating content or managing communities, you'll find me binging anime or trying to convince people that cereal is a soup (it totally is btw, fight me on this 😤)",
      "ngl, pretty stoked to find a tech community that doesn't take itself too seriously! btw anyone here play valorant? looking for squad members who won't judge my iron rank lmao",
      "hot take: dark mode should be the default everywhere and light mode users are actually secret agents trying to blind us all 👀 (jk... unless?)",
      "ok but fr tho - who else is obsessed with mechanical keyboards? my wallet is crying but my fingers are living their best life rn 💸"
    ]
  },
  chatter: {
    sarah: [
      "Just pushed a major refactor to production with zero bugs! 🎉 Sometimes TypeScript feels like having a superpower! Anyone else have those moments where types just save the day?",
      "Had an interesting discussion about state management today. Redux vs Context vs Zustand - what's everyone's take? Personally leaning towards Zustand for smaller apps 🤔",
      "Climbing update: Finally nailed that V5 problem I've been working on! Same feeling as fixing a stubborn bug 💪 Persistence pays off!",
      "Who else gets way too excited about clean code? Just spent my Sunday reorganizing my utility functions and it was... fun? 😅",
      "TIL about the :empty CSS pseudo-class. How did I not know about this before? What's your favorite obscure CSS trick? 🎨"
    ],
    james: [
      "Fascinating article on cognitive biases in UI patterns. We often assume users will make rational choices, but data suggests otherwise. Has anyone conducted similar UX research?",
      "Just finished documenting our design system. 147 pages of meticulous component specifications. Thoroughness in documentation is underrated.",
      "Observation: Users spend 47% more time on pages with proper visual hierarchy. Currently running A/B tests to optimize our landing page layout.",
      "The parallels between photography and interface design are striking. Golden ratio in composition translates remarkably well to component layouts.",
      "Thoughts on neumorphism? While aesthetically pleasing, I have concerns about its impact on accessibility and cognitive load."
    ],
    maya: [
      "y'all ever just stare at your code until your eyes blur and then suddenly the solution hits you like a truck? no? just me? cool cool 😅",
      "petition to rename 'bug fixes' to 'debugging adventures' because that sounds way more epic tbh ⚔️",
      "help!! been stuck in a youtube rabbit hole about mechanical keyboards for 3 hours send help (but also drop your fav switch recommendations first) 🎹",
      "broke: using spotify while coding. woke: lofi beats. ascended: anime openings on repeat 🎵 don't @ me",
      "manifesting the day when css grid just makes sense first try instead of me having to google 'center div' for the 47293th time 😭"
    ]
  }
}

// Separate seeding functions for better organization
async function seedDefaultChannel() {
  const channel = await prisma.channel.upsert({
    where: {
      name: 'general'
    },
    update: {
      description: 'General discussion channel'
    },
    create: {
      name: 'general',
      description: 'General discussion channel'
    }
  })
  console.log('✓ Seeded general channel:', channel.name)
  return channel
}


async function seedChannels() {
  const channels = await Promise.all([
    prisma.channel.upsert({
      where: { name: 'general' },
      update: { description: 'General discussion channel' },
      create: {
        name: 'general',
        description: 'General discussion channel'
      }
    }),
    prisma.channel.upsert({
      where: { name: 'intros' },
      update: { description: 'Introduce yourself to the community!' },
      create: {
        name: 'intros',
        description: 'Introduce yourself to the community!'
      }
    }),
    prisma.channel.upsert({
      where: { name: 'chatter' },
      update: { description: 'General discussion and random topics' },
      create: {
        name: 'chatter',
        description: 'General discussion and random topics'
      }
    })
  ])
  console.log('✓ Channels created:', channels.map(c => c.name).join(', '))
  return channels
}

async function seedUsers() {
  // Create AI_SYSTEM first
  const aiSystem = await prisma.user.upsert({
    where: { id: 'AI_SYSTEM' },
    update: {
      name: 'AI Assistant',
      email: 'ai@chatgenius.local',
      status: 'online',
      isAI: true
    },
    create: {
      id: 'AI_SYSTEM',
      name: 'AI Assistant',
      email: 'ai@chatgenius.local',
      status: 'online',
      isAI: true
    }
  })
  console.log('✓ AI_SYSTEM user created')

  // Create regular users
  const createdUsers = await Promise.all(
    users.map(userData => 
      prisma.user.upsert({
        where: { id: userData.id },
        update: userData,
        create: userData
      })
    )
  )
  console.log('✓ Users created:', createdUsers.map(u => u.name).join(', '))

  // Create AI counterparts
  const aiUsers = await Promise.all(
    createdUsers.map(user =>
      prisma.user.upsert({
        where: { id: `ai_${user.id}` },
        update: {
          name: `AI ${user.name}`,
          email: `ai_${user.email}`,
          status: 'online',
          isAI: true,
          aiOwner: user.id
        },
        create: {
          id: `ai_${user.id}`,
          name: `AI ${user.name}`,
          email: `ai_${user.email}`,
          status: 'online',
          isAI: true,
          aiOwner: user.id
        }
      })
    )
  )
  console.log('✓ AI counterparts created')
  
  return createdUsers
}

async function createDMsBetweenUsers(users: User[]) {
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      await prisma.directChat.create({
        data: {
          participants: {
            connect: [
              { id: users[i].id },
              { id: users[j].id }
            ]
          }
        }
      })
    }
  }
  console.log('✓ DM chats created between all users')
}

async function seedMessages(channels: Channel[], users: User[]) {
  const introChannel = channels.find(c => c.name === 'intros')
  const chatterChannel = channels.find(c => c.name === 'chatter')
  
  if (!introChannel || !chatterChannel) {
    throw new Error('Required channels not found')
  }

  for (const user of users) {
    if (!user.name) {
      console.warn(`Skipping messages for user without name: ${user.id}`)
      continue
    }

    const userKey = user.name.split('_')[0].toLowerCase() as keyof MessagesByUser
    
    // Create intro messages
    for (const message of channelMessages.intros[userKey]) {
      const savedMessage = await prisma.message.create({
        data: {
          content: message,
          authorId: user.id,
          channelId: introChannel.id
        }
      });
      
      // Vectorize intro message
      await vectorizeMessage(savedMessage.id).catch(error => {
        console.error('Failed to vectorize intro message:', error);
      });
    }

    // Create chatter messages
    for (const message of channelMessages.chatter[userKey]) {
      const savedMessage = await prisma.message.create({
        data: {
          content: message,
          authorId: user.id,
          channelId: chatterChannel.id
        }
      });
      
      // Vectorize chatter message
      await vectorizeMessage(savedMessage.id).catch(error => {
        console.error('Failed to vectorize chatter message:', error);
      });
    }
  }
  console.log('✓ Messages seeded and vectorized in both channels')
}

async function createChannelMemberships(channels: Channel[], users: User[]) {
  for (const channel of channels) {
    await Promise.all(
      users.map(user =>
        prisma.channelMembership.create({
          data: {
            userId: user.id,
            channelId: channel.id
          }
        })
      )
    )
  }
  console.log('✓ Channel memberships created')
}

async function main() {
  console.log('🌱 Starting database seed...')
  
  // Clear Pinecone first
  await clearPineconeIndex();

  const channels = await seedChannels()
  const seededUsers = await seedUsers()
  await createDMsBetweenUsers(seededUsers)
  await createChannelMemberships(channels, seededUsers)
  await seedMessages(channels, seededUsers)
  
  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 