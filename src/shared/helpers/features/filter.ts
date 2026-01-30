import { Injectable } from "@nestjs/common";

@Injectable()
export class FilterHelper {
    generateFilterObject<T extends Record<string, any>>(
        filters: T,
        enumFields: string[] = [],
        partialMatchingKey?: string,
        partialMatchingFields: string[] = [],
    ) {
        const prismaFilter: Record<string, any> = {};
        const orConditions: any[] = [];

        for (const [key, rawValue] of Object.entries(filters)) {
            if (rawValue === undefined || rawValue === null || rawValue === "") {
                continue;
            }

            // PARTIAL MATCHING (OR)
            if (key === partialMatchingKey && typeof rawValue === "string") {
                const value = rawValue.trim();
                if (!value || partialMatchingFields.length === 0) continue;

                for (const field of partialMatchingFields) {
                    orConditions.push({
                        [field]: {
                            contains: value,
                            mode: "insensitive",
                        },
                    });
                }
                continue;
            }

            // STRING
            if (typeof rawValue === "string") {
                const value = rawValue.trim();

                if (enumFields.includes(key)) {
                    prismaFilter[key] = { equals: value };
                } else {
                    prismaFilter[key] = {
                        contains: value,
                        mode: "insensitive",
                    };
                }
                continue;
            }

            // NUMBER
            if (typeof rawValue === "number" && !isNaN(rawValue)) {
                prismaFilter[key] = { equals: rawValue };
                continue;
            }

            // BOOLEAN
            if (typeof rawValue === "boolean") {
                prismaFilter[key] = { equals: rawValue };
                continue;
            }

            // DATE
            if (rawValue instanceof Date && !isNaN(rawValue.getTime())) {
                prismaFilter[key] = { equals: rawValue };
            }
        }

        if (orConditions.length > 0) {
            prismaFilter.OR = orConditions;
        }

        return prismaFilter;
    }
}
