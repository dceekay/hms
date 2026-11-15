import { BillPaymentStatus } from "@prisma/client";
import { prisma } from "../../database/prisma";

interface AutoCaptureInput {
  patientId: string;
  serviceName: string;
  fallbackKeywords?: string[];
  quantity?: number;
  notes?: string;
  recordedById?: string;
  dedupeKey: string;
}

function createAutoInvoiceNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDSB-${year}-${suffix}`;
}

/**
 * Safely captures a pending PatientBill from clinical/lab workflows without
 * ever blocking the primary clinical action if a matching service isn't priced.
 */
export async function autoCaptureServiceBill(input: AutoCaptureInput) {
  try {
    const existing = await prisma.patientBill.findFirst({
      where: {
        patientId: input.patientId,
        deletedAt: null,
        notes: { contains: `[${input.dedupeKey}]` },
      },
      select: { id: true },
    });

    if (existing) {
      return null;
    }

    const searchTerms = [
      input.serviceName.trim(),
      ...(input.fallbackKeywords ?? []),
    ].filter(Boolean);

    let matchedService = null;
    for (const term of searchTerms) {
      matchedService = await prisma.hospitalService.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { name: { contains: term } },
            { category: { contains: term } },
          ],
        },
        orderBy: { price: "asc" },
      });
      if (matchedService) break;
    }

    if (!matchedService) {
      return null;
    }

    const unitPrice = Number(matchedService.price ?? 0);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return null;
    }

    const qty = Math.max(1, Number(input.quantity ?? 1));
    const totalAmount = unitPrice * qty;
    const noteBody = input.notes ? `${input.notes} ` : "";

    return await prisma.patientBill.create({
      data: {
        invoiceNumber: createAutoInvoiceNumber(),
        patientId: input.patientId,
        serviceId: matchedService.id,
        quantity: qty,
        unitPrice,
        totalAmount,
        amountPaid: 0,
        paymentStatus: BillPaymentStatus.pending,
        notes: `${noteBody}[${input.dedupeKey}]`,
        recordedById: input.recordedById ?? null,
      },
    });
  } catch (error) {
    console.warn("Auto-charge capture skipped:", error);
    return null;
  }
}
