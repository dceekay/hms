import { BillPaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`;
}

export class DashboardService {
  async overview() {
    const today = startOfToday();
    const monthStart = startOfMonth();

    const [
      totalPatients,
      activePatients,
      inactivePatients,
      investigationPatients,
      newPatients,
      oldPatients,
      registeredToday,
      totalUsers,
      activeUsers,
      activeServices,
      insuranceProviders,
      totalBills,
      pendingBills,
      paidBills,
      billedThisMonth,
      semsasTotal,
      semsasUnfiled,
      semsasFiledThisMonth,
      semsasUnfiledAmount,
      securityInside,
      bedsTotal,
      bedsAvailable,
      bedsOccupied,
      recentPatients,
      recentBills,
      recentSemsas,
      activeDoctors,
      services,
      usersWithServiceAreas,
      billsForServiceSummary,
    ] = await prisma.$transaction([
      prisma.patient.count({ where: { deletedAt: null } }),
      prisma.patient.count({ where: { deletedAt: null, status: "active" } }),
      prisma.patient.count({ where: { deletedAt: null, status: "inactive" } }),
      prisma.patient.count({
        where: { deletedAt: null, patientCategory: "investigation_patient" },
      }),
      prisma.patient.count({
        where: { deletedAt: null, patientCategory: "new_patient" },
      }),
      prisma.patient.count({
        where: { deletedAt: null, patientCategory: "old_patient" },
      }),
      prisma.patient.count({
        where: { deletedAt: null, createdAt: { gte: today } },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.hospitalService.count({
        where: { deletedAt: null, isActive: true },
      }),
      prisma.insuranceProvider.count({
        where: { deletedAt: null, isActive: true },
      }),
      prisma.patientBill.count({ where: { deletedAt: null } }),
      prisma.patientBill.aggregate({
        where: {
          deletedAt: null,
          paymentStatus: BillPaymentStatus.pending,
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.patientBill.aggregate({
        where: {
          deletedAt: null,
          paymentStatus: BillPaymentStatus.paid,
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.patientBill.aggregate({
        where: {
          deletedAt: null,
          billedAt: { gte: monthStart },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.semsasTransfer.count({ where: { deletedAt: null } }),
      prisma.semsasTransfer.count({
        where: { deletedAt: null, filedAt: null },
      }),
      prisma.semsasTransfer.aggregate({
        where: {
          deletedAt: null,
          filedAt: { gte: monthStart },
        },
        _count: true,
        _sum: { feeAmount: true },
      }),
      prisma.semsasTransfer.aggregate({
        where: {
          deletedAt: null,
          filedAt: null,
        },
        _sum: { feeAmount: true },
      }),
      prisma.securityEntryLog.count({
        where: { deletedAt: null, checkedOutAt: null },
      }),
      prisma.bed.count({ where: { deletedAt: null, isActive: true } }),
      prisma.bed.count({
        where: { deletedAt: null, isActive: true, status: "available" },
      }),
      prisma.bed.count({
        where: { deletedAt: null, isActive: true, status: "occupied" },
      }),
      prisma.patient.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { insuranceProvider: true },
      }),
      prisma.patientBill.findMany({
        where: { deletedAt: null },
        orderBy: { billedAt: "desc" },
        take: 5,
        include: {
          patient: true,
          service: true,
          recordedBy: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      }),
      prisma.semsasTransfer.findMany({
        where: { deletedAt: null },
        orderBy: { transferDate: "desc" },
        take: 5,
        include: {
          patient: true,
        },
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          roles: {
            some: {
              role: {
                name: "Doctor",
              },
            },
          },
        },
        orderBy: { firstName: "asc" },
        take: 12,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          phone: true,
          serviceArea: {
            select: {
              name: true,
              code: true,
            },
          },
          doctorProfile: {
            select: {
              doctorType: true,
              specialty: true,
            },
          },
        },
      }),
      prisma.hospitalService.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          isActive: true,
          serviceArea: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      prisma.patientBill.findMany({
        where: { deletedAt: null, billedAt: { gte: monthStart } },
        include: { service: true },
      }),
    ]);

    const serviceRevenueMap = new Map<
      string,
      {
        id: string;
        name: string;
        code: string | null;
        billCount: number;
        totalAmount: number;
      }
    >();

    for (const bill of billsForServiceSummary) {
      const current = serviceRevenueMap.get(bill.serviceId) ?? {
        id: bill.serviceId,
        name: bill.service.name,
        code: bill.service.code,
        billCount: 0,
        totalAmount: 0,
      };

      current.billCount += 1;
      current.totalAmount += toNumber(bill.totalAmount);
      serviceRevenueMap.set(bill.serviceId, current);
    }

    const staffServiceMap = new Map<
      string,
      {
        id: string;
        name: string;
        code: string | null;
        activeUsers: number;
        totalUsers: number;
      }
    >();

    for (const user of usersWithServiceAreas) {
      if (!user.serviceArea) continue;

      const current = staffServiceMap.get(user.serviceArea.id) ?? {
        id: user.serviceArea.id,
        name: user.serviceArea.name,
        code: user.serviceArea.code,
        activeUsers: 0,
        totalUsers: 0,
      };

      current.totalUsers += 1;
      if (user.isActive) current.activeUsers += 1;
      staffServiceMap.set(user.serviceArea.id, current);
    }

    return {
      generatedAt: new Date(),
      patients: {
        total: totalPatients,
        active: activePatients,
        inactive: inactivePatients,
        registeredToday,
        categories: {
          newPatients,
          oldPatients,
          investigationPatients,
        },
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        doctorsAvailable: activeDoctors.length,
        availableDoctors: activeDoctors.map((doctor) => ({
          id: doctor.id,
          name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          username: doctor.username,
          phone: doctor.phone,
          specialty: doctor.doctorProfile?.specialty ?? "General consultation",
          doctorType: doctor.doctorProfile?.doctorType ?? null,
          serviceArea: doctor.serviceArea?.name ?? "Consultation",
        })),
        byService: Array.from(staffServiceMap.values()).sort(
          (a, b) => b.totalUsers - a.totalUsers
        ),
      },
      setup: {
        activeServices,
        insuranceProviders,
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          code: service.code,
          price: service.price,
          isActive: service.isActive,
        })),
      },
      billing: {
        totalBills,
        pendingBills: pendingBills._count,
        paidBills: paidBills._count,
        pendingAmount: toNumber(pendingBills._sum.totalAmount),
        paidAmount: toNumber(paidBills._sum.totalAmount),
        monthBillCount: billedThisMonth._count,
        monthAmount: toNumber(billedThisMonth._sum.totalAmount),
        serviceRevenue: Array.from(serviceRevenueMap.values()).sort(
          (a, b) => b.totalAmount - a.totalAmount
        ),
      },
      operations: {
        semsas: {
          total: semsasTotal,
          unfiled: semsasUnfiled,
          filedThisMonth: semsasFiledThisMonth._count,
          filedAmountThisMonth: toNumber(semsasFiledThisMonth._sum.feeAmount),
          unfiledAmount: toNumber(semsasUnfiledAmount._sum.feeAmount),
        },
        security: {
          currentlyInside: securityInside,
        },
        beds: {
          total: bedsTotal,
          available: bedsAvailable,
          occupied: bedsOccupied,
        },
      },
      recent: {
        patients: recentPatients.map((patient) => ({
          id: patient.id,
          mrn: patient.mrn,
          name: `${patient.firstName} ${patient.lastName}`,
          category: patient.patientCategory,
          status: patient.status,
          insuranceProvider: patient.insuranceProvider?.name ?? null,
          createdAt: patient.createdAt,
        })),
        bills: recentBills.map((bill) => ({
          id: bill.id,
          invoiceNumber: bill.invoiceNumber,
          patientName: `${bill.patient.firstName} ${bill.patient.lastName}`,
          serviceName: bill.service.name,
          paymentStatus: bill.paymentStatus,
          totalAmount: bill.totalAmount,
          billedAt: bill.billedAt,
          recordedBy: bill.recordedBy ? fullName(bill.recordedBy) : null,
        })),
        semsas: recentSemsas.map((transfer) => ({
          id: transfer.id,
          patientName:
            transfer.patient?.firstName && transfer.patient?.lastName
              ? `${transfer.patient.firstName} ${transfer.patient.lastName}`
              : transfer.patientName,
          transferType: transfer.transferType,
          feeAmount: transfer.feeAmount,
          filedAt: transfer.filedAt,
          transferDate: transfer.transferDate,
        })),
      },
    };
  }
}
