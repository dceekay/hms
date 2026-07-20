import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";
import { DepartmentRepository } from "./repository";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./validators";

export class DepartmentService {
  constructor(private readonly departmentRepository = new DepartmentRepository()) {}

  async create(payload: CreateDepartmentDto) {
    const existing = await this.departmentRepository.findOne({ name: payload.name });

    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, "Department already exists");
    }

    return this.departmentRepository.create({
      name: payload.name,
      description: payload.description ?? null,
      isActive: payload.isActive ?? true,
    });
  }

  async list(params: { page?: number; take?: number; search?: string }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const take = params.take && params.take > 0 ? params.take : 10;

    const items = await this.departmentRepository.findManyWithPagination({
      skip: (page - 1) * take,
      take,
      search: params.search,
    });

    return { items, page, take };
  }

  async getById(id: string) {
    const department = await this.departmentRepository.findById(id);

    if (!department) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Department not found");
    }

    return department;
  }

  async update(id: string, payload: UpdateDepartmentDto) {
    const department = await this.departmentRepository.findById(id);

    if (!department) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Department not found");
    }

    return this.departmentRepository.update(id, payload);
  }

  async remove(id: string) {
    const department = await this.departmentRepository.findById(id);

    if (!department) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Department not found");
    }

    return this.departmentRepository.delete(id);
  }
}
