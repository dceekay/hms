import { PrismaClient } from "@prisma/client";
import { nigerianMedications } from "./seed_nigerian_drugs";

const prisma = new PrismaClient();

/**
 * Adds the Nigerian pharmacy catalogue without touching live stock, prices,
 * batches, or user-maintained medicine records. Administrators must set
 * procurement details and stock through the audited Pharmacy Desk workflow.
 */
async function main() {
  let added = 0;
  let alreadyPresent = 0;

  for (const medication of nigerianMedications) {
    const existing = await prisma.medication.findUnique({
      where: {
        name_strength_dosageForm: {
          name: medication.name,
          strength: medication.strength,
          dosageForm: medication.dosageForm,
        },
      },
      select: { id: true },
    });

    if (existing) {
      alreadyPresent += 1;
      continue;
    }

    await prisma.medication.create({
      data: {
        ...medication,
        currentStock: 0,
      },
    });
    added += 1;
  }

  console.log(
    `Nigerian medicine catalogue complete: ${added} added, ${alreadyPresent} already present. All new items have zero stock.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
