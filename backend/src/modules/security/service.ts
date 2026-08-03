import { EntryPersonType } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { ApiError } from "../../shared/errors/ApiError";
import { SecurityEntryRepository } from "./repository";
import {
  SecurityEntryCheckoutDto,
  SecurityEntryCreateDto,
  SecurityEntryUpdateDto,
} from "./validators";
import { NotificationService } from "../notifications/service";

const entryPersonTypes = ["patient", "patient_relative", "staff", "guest"];

function normalizeEmptyValues<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value])
  ) as T;
}

export class SecurityEntryService {
  constructor(private readonly repository = new SecurityEntryRepository()) {}

  async create(payload: SecurityEntryCreateDto, recordedById?: string) {
    const data = normalizeEmptyValues(payload);

    const entry = await this.repository.createEntry({
      ...data,
      recordedById,
    });

    await NotificationService.notifyRoles(["Receptionist", "Administrator", "Super Admin"], {
      title: "New security entry",
      message: `${entry.name || entry.personType.replace("_", " ")} checked in at the entrance.`,
      eventKey: "security.entry.created",
      priority: entry.personType === "patient" ? "info" : "warning",
      linkUrl: "/security/logs",
      metadata: {
        entryId: entry.id,
        personType: entry.personType,
      },
    });

    return entry;
  }

  async list(params: {
    page?: number;
    take?: number;
    search?: string;
    personType?: string;
    activeOnly?: boolean;
  }) {
    const page = params.page ?? 1;
    const take = params.take ?? 20;
    const personType = entryPersonTypes.includes(params.personType ?? "")
      ? (params.personType as EntryPersonType)
      : undefined;
    const items = await this.repository.list({
      skip: (page - 1) * take,
      take,
      search: params.search,
      personType,
      activeOnly: params.activeOnly,
    });

    return { items, page, take };
  }

  async getById(id: string) {
    const entry = await this.repository.findByIdActive(id);

    if (!entry) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Security entry not found.");
    }

    return entry;
  }

  async update(id: string, payload: SecurityEntryUpdateDto) {
    await this.getById(id);

    return this.repository.update(id, normalizeEmptyValues(payload));
  }

  async checkout(id: string, payload: SecurityEntryCheckoutDto) {
    const entry = await this.getById(id);

    if (entry.checkedOutAt) {
      throw new ApiError(HttpStatus.CONFLICT, "Security entry is already checked out.");
    }

    return this.repository.update(id, {
      checkedOutAt: payload.checkedOutAt ? new Date(payload.checkedOutAt) : new Date(),
    });
  }
}
