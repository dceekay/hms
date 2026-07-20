import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";
import { HospitalProfileRepository } from "./repository";
import { HospitalProfileDto } from "./validators";

export class HospitalProfileService {
  constructor(private readonly hospitalProfileRepository = new HospitalProfileRepository()) {}

  async getProfile() {
    const profile = await this.hospitalProfileRepository.getActiveProfile();

    if (!profile) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Hospital profile not found");
    }

    return profile;
  }

  async upsertProfile(payload: HospitalProfileDto) {
    return this.hospitalProfileRepository.createOrUpdate({
      name: payload.name,
      shortName: payload.shortName,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      logoUrl: payload.logoUrl || null,
      isActive: payload.isActive ?? true,
    });
  }
}
