import { InventoryMovementType, Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import {
  InventoryItemDto,
  InventoryMovementDto,
  ListInventoryItemsQueryDto,
  UpdateInventoryItemDto,
} from "./dto";
import { NotificationService } from "../notifications/service";

function cleanText(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ApiError(HttpStatus.CONFLICT, "An inventory item with this code or serial number already exists");
    }

    if (error.code === "P2025") {
      throw new ApiError(HttpStatus.NOT_FOUND, "Inventory item not found");
    }
  }

  throw error;
}

function itemPayload(payload: InventoryItemDto | UpdateInventoryItemDto) {
  return {
    ...payload,
    code: cleanText(payload.code),
    category: cleanText(payload.category),
    itemType: cleanText(payload.itemType),
    description: cleanText(payload.description),
    location: cleanText(payload.location),
    department: cleanText(payload.department),
    supplier: cleanText(payload.supplier),
    serialNumber: cleanText(payload.serialNumber),
    batchNumber: cleanText(payload.batchNumber),
    notes: cleanText(payload.notes),
  };
}

export class InventoryService {
  async listItems(params: ListInventoryItemsQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null,
      ...(params.category ? { category: params.category } : {}),
      ...(params.itemKind === "consumable" ? { isConsumable: true } : {}),
      ...(params.itemKind === "appliance" ? { isConsumable: false } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { code: { contains: params.search } },
              { category: { contains: params.search } },
              { itemType: { contains: params.search } },
              { location: { contains: params.search } },
              { department: { contains: params.search } },
              { supplier: { contains: params.search } },
              { serialNumber: { contains: params.search } },
              { batchNumber: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [allActive, matchingItems, categories] = await prisma.$transaction([
      prisma.inventoryItem.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, currentStock: true, reorderLevel: true, category: true, isConsumable: true },
      }),
      prisma.inventoryItem.findMany({
        where,
        orderBy: [{ currentStock: "asc" }, { name: "asc" }],
      }),
      prisma.inventoryItem.findMany({
        where: { deletedAt: null, category: { not: null } },
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
    ]);

    const filteredItems = matchingItems.filter((item) => {
      if (params.stockStatus === "low") {
        return item.currentStock > 0 && item.currentStock <= item.reorderLevel;
      }

      if (params.stockStatus === "out") {
        return item.currentStock === 0;
      }

      return true;
    });

    const total = filteredItems.length;
    const items = filteredItems.slice((page - 1) * limit, page * limit);
    const lowStock = allActive.filter(
      (item) => item.currentStock > 0 && item.currentStock <= item.reorderLevel
    ).length;
    const outOfStock = allActive.filter((item) => item.currentStock === 0).length;
    const consumables = allActive.filter((item) => item.isConsumable).length;
    const appliances = allActive.filter((item) => !item.isConsumable).length;

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        active: allActive.length,
        lowStock,
        outOfStock,
        consumables,
        appliances,
        categories: categories.map((item) => item.category).filter(Boolean),
      },
    };
  }

  async createItem(payload: InventoryItemDto) {
    try {
      const item = await prisma.inventoryItem.create({
        data: itemPayload(payload) as Prisma.InventoryItemCreateInput,
      });

      await NotificationService.notifyRoles(["Super Admin"], {
        title: "Inventory item added",
        message: `${item.name} was added to hospital inventory with ${item.currentStock} ${item.unit}.`,
        eventKey: "inventory.item.created",
        priority: "info",
        linkUrl: "/inventory",
        metadata: {
          itemId: item.id,
          currentStock: item.currentStock,
          isConsumable: item.isConsumable,
        },
      });

      return item;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateItem(id: string, payload: UpdateInventoryItemDto) {
    try {
      return await prisma.inventoryItem.update({
        where: { id },
        data: itemPayload(payload) as Prisma.InventoryItemUpdateInput,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async recordMovement(id: string, payload: InventoryMovementDto, recordedById?: string) {
    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id, deletedAt: null },
      });

      if (!item) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Inventory item not found");
      }

      const stockAfter = item.currentStock + payload.quantityChange;

      if (stockAfter < 0) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "Stock cannot be reduced below zero");
      }

      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { currentStock: stockAfter },
      });

      await tx.inventoryStockMovement.create({
        data: {
          itemId: id,
          movementType: payload.movementType as InventoryMovementType,
          quantity: payload.quantityChange,
          stockBefore: item.currentStock,
          stockAfter,
          reason: cleanText(payload.reason),
          destination: cleanText(payload.destination),
          issuedTo: cleanText(payload.issuedTo),
          notes: cleanText(payload.notes),
          recordedById: recordedById ?? null,
        },
      });

      return updated;
    });

    const isStockOut = payload.quantityChange < 0;
    const isLossOrDamage = ["damaged", "lost"].includes(payload.movementType);
    const isAppliance = !updated.isConsumable;
    const shouldNotifyOperations = isLossOrDamage || isAppliance || updated.currentStock <= updated.reorderLevel;
    const targetRoles = shouldNotifyOperations
      ? ["Receptionist", "Pharmacist", "Administrator", "Super Admin"]
      : ["Super Admin"];

    await NotificationService.notifyRoles(targetRoles, {
      title: isLossOrDamage
          ? "Inventory exception recorded"
          : isAppliance
            ? "Hospital appliance movement"
            : isStockOut
              ? "Inventory removed"
              : "Inventory added",
      message: `${updated.name} moved ${payload.quantityChange > 0 ? "+" : ""}${payload.quantityChange} ${updated.unit}. Current stock: ${updated.currentStock}.`,
      eventKey: "inventory.movement.created",
      priority: isLossOrDamage || updated.currentStock === 0 ? "critical" : shouldNotifyOperations ? "warning" : "info",
      linkUrl: "/inventory",
      metadata: {
        itemId: updated.id,
        movementType: payload.movementType,
        quantityChange: payload.quantityChange,
        currentStock: updated.currentStock,
        isConsumable: updated.isConsumable,
      },
    });

    return updated;
  }

  async listMovements(params: { itemId?: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;

    const where: Prisma.InventoryStockMovementWhereInput = {
      ...(params.itemId ? { itemId: params.itemId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.inventoryStockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          item: true,
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      }),
      prisma.inventoryStockMovement.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
