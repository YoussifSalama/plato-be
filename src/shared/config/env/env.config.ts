import { registerAs } from '@nestjs/config';
import { IEnvParams, IEnvType, IOpenAiKeyConfig } from '../../types/config/env.types';

export default registerAs(
    'env',
    (): IEnvParams => {
        const openAiKeyNamePattern = /^OPENAI_API_KEY(?:_\d+)?$/;
        const openAiKeyEnvNames = Object.keys(process.env)
            .filter((key) => openAiKeyNamePattern.test(key))
            .sort((a, b) => {
                const matchA = a.match(/^OPENAI_API_KEY_(\d+)$/);
                const matchB = b.match(/^OPENAI_API_KEY_(\d+)$/);
                const indexA = matchA ? Number(matchA[1]) + 1 : 0;
                const indexB = matchB ? Number(matchB[1]) + 1 : 0;
                return indexA - indexB;
            });

        const openAiKeys: IOpenAiKeyConfig[] = openAiKeyEnvNames
            .map((envName, index) => {
                const apiKey = (process.env[envName] ?? '').trim();
                const configuredPlatoKeyId = (process.env[`${envName}_PLATO`] ?? '').trim();
                const platoKeyId = configuredPlatoKeyId || `${envName.toLowerCase()}_${index}`;
                return {
                    index,
                    envName,
                    platoKeyId,
                    apiKey,
                };
            })
            .filter((item) => Boolean(item.apiKey));

        return ({
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
            keys: openAiKeys,
        },
        sendGrid: {
            enabled: process.env.SENDGRID_ENABLED
                ? process.env.SENDGRID_ENABLED === 'true'
                : true,
            apiKey: process.env.SENDGRID_API_KEY ?? '',
            fromEmail: process.env.SENDGRID_FROM_EMAIL ?? '',
            fromName: process.env.SENDGRID_FROM_NAME ?? '',
        },
        google: {
            agencyClientId: process.env.GOOGLE_CLIENT_ID_AGENCY ?? '',
            candidateClientId: process.env.GOOGLE_CLIENT_ID_CANDIDATE ?? '',
        },
        twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
            authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
            phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? '',
        },
        frontendUrl: process.env.FRONTEND_URL ?? '',
        frontendUrlCandidate: process.env.FRONTEND_URL_CANDIDATE ?? '',
        elevenlabs: {
            apiKey: process.env.ELEVENLABS_API_KEY ?? '',
            agentId: process.env.ELEVENLABS_AGENT_ID ?? undefined,
            agentIdAr: process.env.ELEVENLABS_AGENT_ID_AR ?? '',
            agentIdEn: process.env.ELEVENLABS_AGENT_ID_EN ?? '',
            webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET ?? '',
            managedPromptVersion: process.env.ELEVENLABS_MANAGED_PROMPT_VERSION ?? "v1",
            allowAgentMutation: process.env.ELEVENLABS_ALLOW_AGENT_MUTATION === "true",
        },
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY ?? '',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
        },
    });
    },
);