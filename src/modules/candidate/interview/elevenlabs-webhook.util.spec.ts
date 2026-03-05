import { createHmac } from "crypto";
import {
    extractInterviewSessionIdFromWebhookPayload,
    verifyElevenLabsWebhookSignature,
} from "./elevenlabs-webhook.util";

describe("elevenlabs-webhook.util", () => {
    it("verifies valid ElevenLabs webhook signature", () => {
        const payload = JSON.stringify({ type: "post_call_transcription", data: { ok: true } });
        const timestamp = `${Math.floor(Date.now() / 1000)}`;
        const secret = "test_secret";
        const signature = createHmac("sha256", secret)
            .update(`${timestamp}.${payload}`)
            .digest("hex");
        const header = `t=${timestamp},v0=${signature}`;

        expect(
            verifyElevenLabsWebhookSignature({
                payload,
                signatureHeader: header,
                secret,
            })
        ).toBe(true);
    });

    it("rejects invalid signature", () => {
        const payload = JSON.stringify({ hello: "world" });
        const timestamp = `${Math.floor(Date.now() / 1000)}`;
        const header = `t=${timestamp},v0=deadbeef`;

        expect(
            verifyElevenLabsWebhookSignature({
                payload,
                signatureHeader: header,
                secret: "test_secret",
            })
        ).toBe(false);
    });

    it("extracts interview_session_id from webhook dynamic variables", () => {
        const payload = {
            data: {
                conversation_initiation_client_data: {
                    dynamic_variables: {
                        interview_session_id: "17",
                    },
                },
            },
        };
        expect(extractInterviewSessionIdFromWebhookPayload(payload)).toBe(17);
    });
});
