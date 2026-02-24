import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface GoogleUserProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly agencyClientId: string;
  private readonly candidateClientId: string;
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    const googleEnv = this.configService.get<{
      agencyClientId: string;
      candidateClientId: string;
    }>('env.google');

    this.agencyClientId = googleEnv?.agencyClientId ?? '';
    this.candidateClientId = googleEnv?.candidateClientId ?? '';
    this.client = new OAuth2Client();

    if (!this.agencyClientId || !this.candidateClientId) {
      this.logger.warn(
        'GoogleAuthService initialized but GOOGLE_CLIENT_ID_AGENCY or GOOGLE_CLIENT_ID_CANDIDATE is missing.',
      );
    }
  }

  private async verifyIdToken(idToken: string, audience: string): Promise<TokenPayload> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google ID token payload.');
      }
      return payload;
    } catch (error) {
      this.logger.error('Failed to verify Google ID token', error instanceof Error ? error.stack : undefined);
      throw new UnauthorizedException('Invalid Google ID token.');
    }
  }

  private toProfile(payload: TokenPayload): GoogleUserProfile {
    return {
      sub: payload.sub ?? '',
      email: payload.email ?? '',
      emailVerified: Boolean(payload.email_verified),
      givenName: payload.given_name ?? '',
      familyName: payload.family_name ?? '',
      picture: payload.picture,
    };
  }

  async verifyAgencyIdToken(idToken: string): Promise<GoogleUserProfile> {
    if (!this.agencyClientId) {
      throw new UnauthorizedException('Google sign-in is not configured for agency.');
    }
    const payload = await this.verifyIdToken(idToken, this.agencyClientId);
    if (!payload.email) {
      throw new UnauthorizedException('Google profile is missing email.');
    }
    return this.toProfile(payload);
  }

  async verifyCandidateIdToken(idToken: string): Promise<GoogleUserProfile> {
    if (!this.candidateClientId) {
      throw new UnauthorizedException('Google sign-in is not configured for candidate.');
    }
    const payload = await this.verifyIdToken(idToken, this.candidateClientId);
    if (!payload.email) {
      throw new UnauthorizedException('Google profile is missing email.');
    }
    return this.toProfile(payload);
  }
}

