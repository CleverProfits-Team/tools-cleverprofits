import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL

  if (!email) {
    console.error('Error: SEED_SUPER_ADMIN_EMAIL environment variable is required.')
    process.exit(1)
  }

  if (!email.endsWith('@cleverprofits.com')) {
    console.error('Error: SEED_SUPER_ADMIN_EMAIL must be a @cleverprofits.com address.')
    process.exit(1)
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: Role.SUPER_ADMIN },
    create: { email, role: Role.SUPER_ADMIN },
  })

  console.log(`✓ SUPER_ADMIN seeded: ${user.email} (id: ${user.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
