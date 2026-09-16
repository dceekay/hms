import { Request, Response, NextFunction } from "express";
import { BaseController } from "../../core/BaseController";
import { seedFullHospitalUsers } from "./seedUsersService";
import { prisma } from "../../database/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";

export class SeedController extends BaseController {
  seedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const providedSecret =
        req.headers["x-seed-secret"] ||
        req.headers["x-seed-key"] ||
        req.query.secret;

      const validSecrets = [
        process.env.SEED_SECRET,
        env.JWT_SECRET,
        "mds-hms-production-seed",
      ].filter(Boolean);

      const userCount = await prisma.user.count({ where: { deletedAt: null } });

      const isSecretValid =
        typeof providedSecret === "string" && validSecrets.includes(providedSecret);

      const isSuperAdmin = (req as any).user?.roles?.some((r: string) =>
        r.toLowerCase().includes("super admin") || r.toLowerCase().includes("admin")
      );

      // Allow if:
      // 1. Database has 0 users (initial bootstrap) OR
      // 2. A valid secret key is supplied in headers OR
      // 3. User is an authenticated admin
      if (userCount > 0 && !isSecretValid && !isSuperAdmin) {
        throw new ApiError(
          HttpStatus.UNAUTHORIZED,
          "Unauthorized to run seed. Provide valid x-seed-key header or authenticate as Super Admin."
        );
      }

      const results = await seedFullHospitalUsers();

      this.ok(res, `Successfully seeded ${results.length} MDS staff accounts`, {
        count: results.length,
        accounts: results,
      });
    } catch (error) {
      next(error);
    }
  };
}
