import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class RandomUuidServie {
    generateInvitationToken(validityInDays: number) {
        return {
            token: crypto.randomBytes(32).toString('hex'),
            expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * validityInDays),
        };
    }
}