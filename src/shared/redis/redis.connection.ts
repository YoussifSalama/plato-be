import { ConnectionOptions } from 'bullmq';

const redisPortValue = Number(process.env.REDIS_PORT);
const redisPort = Number.isFinite(redisPortValue) ? redisPortValue : 6379;

const redisConnection: ConnectionOptions = {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: redisPort,
    password: process.env.REDIS_PASSWORD ?? undefined,
};

export default redisConnection;