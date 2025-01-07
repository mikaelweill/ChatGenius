import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Separate seeding functions for better organization
async function seedDefaultChannel() {
  const generalChannel = await prisma.channel.upsert({
    where: { name: 'general' },
    update: {},
    create: {
      name: 'general',
      description: 'General discussion'
    },
  })
  
  console.log('✓ Seeded general channel:', generalChannel.name)
  return generalChannel
}

// Add more seed functions as needed
async function seedDefaultUser() {
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@example.com',
    },
  })
  
  console.log('✓ Seeded admin user:', adminUser.name)
  return adminUser
}

// Main seeding function
async function main() {
  console.log('🌱 Starting database seed...')
  
  try {
    // Sequential seeding for better control and error handling
    const channel = await seedDefaultChannel()
    const admin = await seedDefaultUser()
    
    // Connect admin to general channel
    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        members: {
          connect: { id: admin.id }
        }
      }
    })
    
    console.log('✅ Database seeding completed')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

// Execute main function
main()
  .catch((e) => {
    console.error('❌ Fatal error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    // Ensure proper cleanup
    try {
      await prisma.$disconnect()
    } catch (e) {
      console.error('❌ Error disconnecting from database:', e)
      process.exit(1)
    }
  }) 