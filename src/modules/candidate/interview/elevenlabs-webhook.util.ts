import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_PREFIX = "t=";
const HASH_PREFIX = "v0=";

type SignatureParts = {
    timestamp: string;
    signature: string;
};

function parseSignatureHeader(signatureHeader: string): SignatureParts | null {
    const chunks = signatureHeader.split(",");
    const timestampChunk = chunks.find((item) => item.trim().startsWith(SIGNATURE_PREFIX));
    const signatureChunk = chunks.find((item) => item.trim().startsWith(HASH_PREFIX));
    if (!timestampChunk || !signatureChunk) {
        return null;
    }
    const timestamp = timestampChunk.trim().slice(SIGNATURE_PREFIX.length);
    const signature = signatureChunk.trim().slice(HASH_PREFIX.length);
    if (!timestamp || !signature) {
        return null;
    }
    return { timestamp, signature };
}

export function verifyElevenLabsWebhookSignature(params: {
    payload: string;
    signatureHeader: string;
    secret: string;
    toleranceSeconds?: number;
}): boolean {
    const toleranceSeconds = params.toleranceSeconds ?? 300;
    const parsed = parseSignatureHeader(params.signatureHeader);
    if (!parsed) {
        return false;
    }

    const timestampMs = Number(parsed.timestamp) * 1000;
    if (!Number.isFinite(timestampMs)) {
        return false;
    }
    if (Math.abs(Date.now() - timestampMs) > toleranceSeconds * 1000) {
        return false;
    }

    const signedPayload = `${parsed.timestamp}.${params.payload}`;
    const expected = createHmac("sha256", params.secret).update(signedPayload).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(parsed.signature, "hex");

    if (expectedBuffer.length !== actualBuffer.length) {
        return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function extractInterviewSessionIdFromWebhookPayload(payload: unknown): number | null {
    if (!payload || typeof payload !== "object") {
        return null;
    }
    const data = payload as {
        data?: {
            conversation_initiation_client_data?: {
                dynamic_variables?: Record<string, unknown>;
            };
        };
    };
    const rawValue =
        data.data?.conversation_initiation_client_data?.dynamic_variables?.interview_session_id;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}
