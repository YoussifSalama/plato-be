import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import errorFormatter from "../helpers/error";
import { AccessTokenPayload, RefreshTokenPayload } from "../types/services/jwt.types";


@Injectable()
export class JwtService {
    private readonly tokenSecrets: { access: string, refresh: string };
    constructor(private readonly config: ConfigService) {
        this.tokenSecrets = {
            access: this.config.get<string>("env.tokens.access") ?? "",
            refresh: this.config.get<string>("env.tokens.refresh") ?? "",
        };
        if (!this.tokenSecrets.access || !this.tokenSecrets.refresh) {
            throw new BadRequestException(errorFormatter({ defaultMessage: "Token secrets are not configured.", message: "Something went wrong." }));
        }
    }

    async generateAccessToken(payload: AccessTokenPayload) {
        return jwt.sign(payload, this.tokenSecrets.access, { expiresIn: "15m" });
    }

    async generateRefreshToken(payload: RefreshTokenPayload) {
        return {
            refresh_token: jwt.sign(payload, this.tokenSecrets.refresh, { expiresIn: "7d" }),
            expires_at: this.getRefreshTokenExpirationDate(),
        };
    }

    verifyAccessToken(token: string): AccessTokenPayload {
        return jwt.verify(token, this.tokenSecrets.access) as AccessTokenPayload;
    }

    private getRefreshTokenExpirationDate() {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    async verifyRefreshToken(token: string) {
        return jwt.verify(token, this.tokenSecrets.refresh) as RefreshTokenPayload;
    }
}