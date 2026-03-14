import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "../services/jwt.services";
import { AccessTokenPayload, IJwtProvider, SessionTokenPayload } from "../types/services/jwt.types";

@Injectable()
export class CandidateOrSessionJwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
            throw new UnauthorizedException("Missing bearer token.");
        }

        // Try access token (candidate) first
        try {
            const payload = this.jwtService.verifyAccessToken(token) as AccessTokenPayload;
            if (payload.provider === IJwtProvider.candidate) {
                request.user = { id: payload.id };
                return true;
            }
        } catch {
            // Fall through to try session token
        }

        // Try session token
        try {
            const payload = this.jwtService.verifySessionToken(token) as SessionTokenPayload;
            if (payload.provider !== IJwtProvider.candidate_session) {
                throw new UnauthorizedException("Invalid token provider.");
            }
            // For session token, validate interview_session_id when present in request
            const requestSessionId = this.getRequestInterviewSessionId(request);
            if (requestSessionId != null && payload.interview_session_id !== requestSessionId) {
                throw new ForbiddenException("Session token does not match interview session.");
            }
            request.user = { id: payload.id };
            return true;
        } catch (err) {
            if (err instanceof ForbiddenException) throw err;
            throw new UnauthorizedException("Invalid or expired token.");
        }
    }

    private getRequestInterviewSessionId(request: {
        body?: { interview_session_id?: number };
        params?: { sessionId?: string; interviewSessionId?: string };
        query?: { interview_session_id?: string };
    }): number | null {
        const fromBody = request.body?.interview_session_id;
        if (fromBody != null && typeof fromBody === "number") return fromBody;
        const fromParams =
            request.params?.interviewSessionId ?? request.params?.sessionId;
        if (fromParams != null) {
            const n = parseInt(fromParams, 10);
            if (!isNaN(n)) return n;
        }
        const fromQuery = request.query?.interview_session_id;
        if (fromQuery != null) {
            const n = parseInt(String(fromQuery), 10);
            if (!isNaN(n)) return n;
        }
        return null;
    }
}
