import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import redisConnection from "src/shared/redis/redis.connection";

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;

    constructor() {
        const { host, port, password } = redisConnection as {
            host?: string;
            port?: number;
            password?: string;
        };
        this.client = new Redis({ host, port, password });
    }

    getClient(): Redis {
        return this.client;
    }

    async setValue(key: string, value: unknown, ttl?: number): Promise<void> {
        const payload = JSON.stringify(value);
        if (ttl) {
            await this.client.set(key, payload, "EX", ttl);
            return;
        }
        await this.client.set(key, payload);
    }

    async getValue<T = unknown>(key: string): Promise<T | null> {
        const value = await this.client.get(key);
        if (!value) {
            return null;
        }
        return JSON.parse(value) as T;
    }

    async deleteValue(key: string): Promise<number> {
        return this.client.del(key);
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }
}

