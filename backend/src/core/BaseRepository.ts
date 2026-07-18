type WhereClause = Record<string, unknown>;
type OrderByClause = Record<string, "asc" | "desc">;

export abstract class BaseRepository<T extends { id: string }> {
  protected constructor(protected readonly model: any) {}

  async create(data: Partial<T>): Promise<T> {
    return this.model.create({ data });
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }

  async findOne(where: WhereClause): Promise<T | null> {
    return this.model.findFirst({ where });
  }

  async findMany(
    where?: WhereClause,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: OrderByClause;
    }
  ): Promise<T[]> {
    return this.model.findMany({
      where,
      ...options,
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }
}
