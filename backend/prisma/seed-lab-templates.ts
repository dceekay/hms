import { seedNigerianLaboratoryTemplates } from "../src/modules/setup/seedLabTemplatesService";
import { prisma } from "../src/database/prisma";

async function main() {
  console.log("--------------------------------------------------");
  console.log("  MDS SPECIALIST HOSPITAL KANO");
  console.log("  Seeding 29 Standard Nigerian Laboratory Templates");
  console.log("  (Safe Upsert Mode - Preserves All Current Data)");
  console.log("--------------------------------------------------");

  const startTime = Date.now();
  const seeded = await seedNigerianLaboratoryTemplates();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\nSuccessfully seeded ${seeded.length} Nigerian lab templates in ${duration}s!`);
  console.log("Existing hospital data, patients, and bills were untouched.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
