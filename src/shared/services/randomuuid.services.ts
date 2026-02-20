import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class RandomUuidService {
    generateInvitationToken(validityInDays: number) {
        return {
            token: crypto.randomBytes(32).toString('hex'),
            expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * validityInDays),
        };
    }

    generateInvitationCode(validityInMinutes: number) {
        const code = uuidv4().split('-')[0];
        return {
            code,
            expires_at: new Date(Date.now() + 1000 * 60 * validityInMinutes),
        };
    }
}