export enum IJwtProvider {
    agency = "agency",
    candidate = "candidate",
}
export interface RefreshTokenPayload {
    id: number;
    provider: IJwtProvider;
}

export interface AccessTokenPayload {
    id: number;
    provider: IJwtProvider;
}
