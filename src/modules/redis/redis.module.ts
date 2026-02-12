import { Module } from "@nestjs/common";
import { RedisService } from "./redis.services";

@Module({
    providers: [
        RedisService
    ],
    exports: [
        RedisService
    ]
})
export class RedisModule { };