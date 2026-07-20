import { Prisma, HospitalProfile } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export class HospitalProfileRepository extends BaseRepository<HospitalProfile> {
  constructor() {
    super(prisma.hospitalProfile);
  }

  async getActiveProfile(): Promise<HospitalProfile | null> {
    return this.model.findFirst({ where: { isActive: true } });
  }

  async createOrUpdate(payload: Prisma.HospitalProfileCreateInput): Promise<HospitalProfile> {
    const existing = await this.getActiveProfile();

    if (existing) {
      return this.model.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return this.model.create({ data: payload });
  }
}
