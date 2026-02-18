import { registerAs } from '@nestjs/config';
import { IEnvParams, IEnvType } from '../../types/config/env.types';

export default registerAs(
    'env',
    (): IEnvParams => ({
        nodeEnv: (process.env.NODE_ENV as IEnvType) ?? 'development',
        tokens: {
            access: process.env.ACCESS_TOKEN_SECRET ?? '',
            refresh: process.env.REFRESH_TOKEN_SECRET ?? '',
        },
        hashing: {
            passwordRounds: Number(process.env.BCRYPT_PASSWORD_ROUNDS ?? 10),
            otpRounds: Number(process.env.BCRYPT_OTP_ROUNDS ?? 10),
        },
        redis: {
            host: process.env.REDIS_HOST ?? '',
            port: Number(process.env.REDIS_PORT ?? 6379),
            password: process.env.REDIS_PASSWORD ?? undefined,
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY ?? '',
        },
        sendGrid: {
            enabled: process.env.SENDGRID_ENABLED
                ? process.env.SENDGRID_ENABLED === 'true'
                : true,
            apiKey: process.env.SENDGRID_API_KEY ?? '',
            fromEmail: process.env.SENDGRID_FROM_EMAIL ?? '',
            fromName: process.env.SENDGRID_FROM_NAME ?? '',
        },
        twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
            authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
            phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? '',
        },
        frontendUrl: process.env.FRONTEND_URL ?? '',
        frontendUrlCandidate: process.env.FRONTEND_URL_CANDIDATE ?? '',
    }),
);
