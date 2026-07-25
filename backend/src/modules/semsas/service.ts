import { SemsasTransferType } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { ApiError } from "../../shared/errors/ApiError";
import { SemsasFilingDto, SemsasTransferCreateDto, SemsasTransferUpdateDto } from "./validators";
import { SemsasRepository } from "./repository";

const transferTypes = [
  "hospital_ambulance_to_other_hospital",
  "hospital_ambulance_to_this_hospital",
  "external_ambulance_to_this_hospital",
];

function normalizeEmptyValues<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value])
  ) as T;
}

function toTransferCreateData(payload: SemsasTransferCreateDto) {
  const data = normalizeEmptyValues(payload);

  return {
    ...data,
    transferDate: new Date(String(data.transferDate)),
  };
}

function toTransferUpdateData(payload: SemsasTransferUpdateDto) {
  const data = normalizeEmptyValues(payload);

  return {
    ...data,
    ...(data.transferDate ? { transferDate: new Date(String(data.transferDate)) } : {}),
  };
}

export class SemsasService {
  constructor(private readonly repository = new SemsasRepository()) {}

  create(payload: SemsasTransferCreateDto, recordedById?: string) {
    return this.repository.createTransfer({
      ...toTransferCreateData(payload),
      recordedById,
    });
  }

  async list(params: {
    page?: number;
    take?: number;
    search?: string;
    transferType?: string;
    month?: string;
    filingStatus?: "filed" | "unfiled";
  }) {
    const page = params.page ?? 1;
    const take = params.take ?? 20;
    const transferType = transferTypes.includes(params.transferType ?? "")
      ? (params.transferType as SemsasTransferType)
      : undefined;
    const [items, total] = await this.repository.list({
      skip: (page - 1) * take,
      take,
      search: params.search,
      transferType,
      month: params.month,
      filingStatus: params.filingStatus,
    });

    return {
      items,
      meta: {
        page,
        take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getById(id: string) {
    const transfer = await this.repository.findByIdActive(id);

    if (!transfer) {
      throw new ApiError(HttpStatus.NOT_FOUND, "SEMSAS record not found.");
    }

    return transfer;
  }

  async update(id: string, payload: SemsasTransferUpdateDto) {
    await this.getById(id);

    return this.repository.updateTransfer(id, toTransferUpdateData(payload));
  }

  async fileMonthly(payload: SemsasFilingDto, filedById?: string) {
    return this.repository.fileMonthly(payload.month, filedById, payload.notes);
  }
}
