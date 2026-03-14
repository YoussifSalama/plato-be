export enum IJwtProvider {
    agency = "agency",
    candidate = "candidate",
    candidate_session = "candidate_session",
}

export interface SessionTokenPayload {
    id: number;
    provider: IJwtProvider;
    interview_session_id: number;
}
export interface RefreshTokenPayload {
    id: number;
    provider: IJwtProvider;
}

export interface AccessTokenPayload {
    id: number;
    provider: IJwtProvider;
}