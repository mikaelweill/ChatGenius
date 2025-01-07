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

// Main seeding function
async function main() {
  console.log('🌱 Starting database seed...')
  
  // Create channel and user
  const channel = await seedDefaultChannel()
  const admin = await seedDefaultUser()

  // Create or update the channel membership
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
}

// Execute main function
main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 