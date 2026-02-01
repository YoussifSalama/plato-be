import { IoAdapter } from "@nestjs/platform-socket.io";
import type { INestApplication } from "@nestjs/common";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, RedisClientType } from "redis";

type RedisConnectionOptions = {
    host: string;
    port: number;
    password?: string;
};

export class RedisIoAdapter extends IoAdapter {
    private adapterConstructor?: ReturnType<typeof createAdapter>;
    private pubClient?: RedisClientType;
    private subClient?: RedisClientType;

    constructor(app: INestApplication) {
        super(app);
    }

    async connectToRedis(options: RedisConnectionOptions) {
        const url = this.buildRedisUrl(options);
        this.pubClient = createClient({ url });
        this.subClient = this.pubClient.duplicate();

        await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
        this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    }

    createIOServer(port: number, options?: Record<string, unknown>) {
        const server = super.createIOServer(port, options);
        if (this.adapterConstructor) {
            server.adapter(this.adapterConstructor);
        }
        return server;
    }

    private buildRedisUrl(options: RedisConnectionOptions) {
        const password = options.password ? encodeURIComponent(options.password) : "";
        const credentials = password ? `:${password}@` : "";
        return `redis://${credentials}${options.host}:${options.port}`;
    }
}

