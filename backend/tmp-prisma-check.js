const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  try {
    const result = await prisma.laboratoryRequest.findMany({
      take: 1,
      include: { patient: true, template: true },
    });
    console.log('ok', result.length);
  } catch (e) {
    console.error('ERR', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
