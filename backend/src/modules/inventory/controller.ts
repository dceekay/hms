import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  inventoryItemSchema,
  inventoryMovementSchema,
  listInventoryItemsQuerySchema,
  updateInventoryItemSchema,
} from "./dto";
import { InventoryService } from "./service";

export class InventoryController extends BaseController {
  constructor(private readonly inventoryService = new InventoryService()) {
    super();
  }

  listItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.inventoryService.listItems(
        listInventoryItemsQuerySchema.parse(req.query)
      );

      this.ok(res, "Inventory items fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const item = await this.inventoryService.createItem(
        inventoryItemSchema.parse(req.body)
      );

      this.created(res, "Inventory item created successfully", item);
    } catch (error) {
      next(error);
    }
  };

  updateItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const item = await this.inventoryService.updateItem(
        String(req.params.id),
        updateInventoryItemSchema.parse(req.body)
      );

      this.ok(res, "Inventory item updated successfully", item);
    } catch (error) {
      next(error);
    }
  };

  recordMovement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const item = await this.inventoryService.recordMovement(
        String(req.params.id),
        inventoryMovementSchema.parse(req.body),
        req.user?.sub
      );

      this.ok(res, "Inventory movement recorded successfully", item);
    } catch (error) {
      next(error);
    }
  };

  listMovements = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.inventoryService.listMovements({
        itemId: typeof req.query.itemId === "string" ? req.query.itemId : undefined,
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
      });

      this.ok(res, "Inventory movements fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
