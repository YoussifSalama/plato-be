import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "../services/jwt.services";
import { AccessTokenPayload, IJwtProvider } from "../types/services/jwt.types";

@Injectable()
export class CandidateJwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
            throw new UnauthorizedException("Missing bearer token.");
        }
        let payload: AccessTokenPayload;
        try {
            payload = this.jwtService.verifyAccessToken(token);
        } catch {
            throw new UnauthorizedException("Invalid or expired token.");
        }
        if (payload.provider !== IJwtProvider.candidate) {
            throw new UnauthorizedException("Invalid token provider.");
        }
        request.user = payload;
        return true;
    }
}

