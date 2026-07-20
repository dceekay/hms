import { NextFunction, Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { DepartmentService } from "./service";
import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";

export class DepartmentController extends BaseController {
  constructor(private readonly departmentService = new DepartmentService()) {
    super();
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.create(req.body);
      return this.created(res, "Department created successfully", department);
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error);
      }

      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const take = Number(req.query.take) || 10;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const data = await this.departmentService.list({ page, take, search });
      return this.ok(res, "Departments retrieved successfully", data);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const department = await this.departmentService.getById(id);
      return this.ok(res, "Department retrieved successfully", department);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === HttpStatus.NOT_FOUND) {
        return next(error);
      }

      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const department = await this.departmentService.update(id, req.body);
      return this.ok(res, "Department updated successfully", department);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.departmentService.remove(id);
      return this.ok(res, "Department deleted successfully");
    } catch (error) {
      next(error);
    }
  };
}
