import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

// Add more seed functions as needed
/*
async function seedDefaultUser() {
  const user = await prisma.user.upsert({
    where: {
      email: 'admin@example.com'
    },
    update: {
      name: 'Admin',
      status: 'online'
    },
    create: {
      name: 'Admin',
      email: 'admin@example.com',
      status: 'online'
    }
  })
  console.log('✓ Seeded admin user:', user.name)
  return user
}
*/

async function main() {
  console.log('🌱 Starting database seed...')
  
  // Create channel
  const channel = await seedDefaultChannel()
  
  /*
  // Create admin user and membership
  const admin = await seedDefaultUser()
  await prisma.channelMembership.upsert({
    where: {
      id: `${admin.id}-${channel.id}`
    },
    update: {},
    create: {
      userId: admin.id,
      channelId: channel.id
    }
  })
  console.log('✓ Connected admin to general channel')
  */

  // Create AI_SYSTEM user if it doesn't exist
  const aiUser = await prisma.user.upsert({
    where: { id: 'AI_SYSTEM' },
    update: {},
    create: {
      id: 'AI_SYSTEM',
      name: 'AI Assistant',
      email: 'ai@chatgenius.local',
      status: 'online'
    }
  })

  console.log('✓ AI_SYSTEM user created:', aiUser)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 