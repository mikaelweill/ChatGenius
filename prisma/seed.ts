import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default channels
  await prisma.channel.createMany({
    data: [
      { name: 'general', description: 'General discussion' },
      { name: 'random', description: 'Random chatter' },
    ],
    skipDuplicates: true,
  })

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 