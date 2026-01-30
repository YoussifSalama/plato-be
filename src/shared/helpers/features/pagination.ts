import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { paginationDto } from "src/shared/dto/pagination.dto";
import { Prisma } from "@generated/prisma";

export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  current_page: number;
  next_page: number | null;
  previous_page: number | null;
  has_next_page: boolean;
  has_previous_page: boolean;
  is_first_page: boolean;
  is_last_page: boolean;
}

export type modelQuery = {
  skip: number;
  take: number;
};

@Injectable()
export class PaginationHelper {
  constructor(private readonly prisma: PrismaService) { }

  async generatePaginationMeta(
    pagination: paginationDto,
    model: Prisma.ModelName,
    where: Record<string, any> = {},
  ): Promise<IPaginationMeta> {
    const { page = 1, limit = 10 } = pagination;

    const total = await this.prisma[model].count({ where });
    const totalPages = Math.ceil(total / limit);
    const current_page = page;
    const next_page = page < totalPages ? page + 1 : null;
    const previous_page = page > 1 ? page - 1 : null;
    const has_next_page = page < totalPages;
    const has_previous_page = page > 1;
    const is_first_page = page === 1;
    const is_last_page = page === totalPages;
    return {
      total,
      page,
      limit,
      total_pages: totalPages,
      current_page,
      next_page,
      previous_page,
      has_next_page,
      has_previous_page,
      is_first_page,
      is_last_page,
    };
  }

  async applyPagination(pagination: paginationDto): Promise<modelQuery> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const take = limit;
    return {
      skip,
      take,
    };
  }
}
