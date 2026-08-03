import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  updateAppointmentStatusSchema,
} from "./dto";
import { AppointmentService } from "./service";

export class AppointmentController extends BaseController {
  constructor(private readonly appointmentService = new AppointmentService()) {
    super();
  }

  listDoctors = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctors = await this.appointmentService.listDoctors();
      this.ok(res, "Doctors fetched successfully", doctors);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.appointmentService.list(
        listAppointmentsQuerySchema.parse(req.query),
        req.user?.sub
      );

      this.ok(res, "Appointments fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const appointment = await this.appointmentService.create(
        createAppointmentSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Appointment created successfully", appointment);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const appointment = await this.appointmentService.updateStatus(
        String(req.params.id),
        updateAppointmentStatusSchema.parse(req.body)
      );

      this.ok(res, "Appointment updated successfully", appointment);
    } catch (error) {
      next(error);
    }
  };
}
