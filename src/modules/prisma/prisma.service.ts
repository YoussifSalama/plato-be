import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL is not set');
        }
        const pool = new Pool({
            connectionString,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 10,
        });
        const adapter = new PrismaPg(pool);
        super({ adapter });
    }

    async onModuleInit() {
        const maxAttempts = 5;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                await this.$connect();
                return;
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
}