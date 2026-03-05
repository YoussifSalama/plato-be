import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ElevenLabsService {
    private readonly logger = new Logger(ElevenLabsService.name);

    constructor(private readonly configService: ConfigService) {}

    async getSignedUrl(params?: {
        agentId?: string;
        includeConversationId?: boolean;
        interviewSessionId?: number;
    }): Promise<{ signed_url: string; conversation_id?: string; expires_at: string }> {
        const apiKey = this.configService.get<string>("env.elevenlabs.apiKey");
        const defaultAgentId = this.configService.get<string>("env.elevenlabs.agentId");
        const resolvedAgentId = params?.agentId ?? defaultAgentId;

        if (!apiKey) {
            throw new BadRequestException("ElevenLabs API key is not configured.");
        }
        if (!resolvedAgentId) {
            throw new BadRequestException("ElevenLabs agent ID is not configured.");
        }

        const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
        url.searchParams.set("agent_id", resolvedAgentId);
        if (params?.includeConversationId) {
            url.searchParams.set("include_conversation_id", "true");
        }

        const maxAttempts = 3;
        let attempt = 0;
        let lastError: string | null = null;
        let response: Response | null = null;
        const startedAt = Date.now();

        while (attempt < maxAttempts) {
            attempt += 1;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            try {
                response = await fetch(url.toString(), {
                    method: "GET",
                    headers: {
                        "xi-api-key": apiKey,
                        "Content-Type": "application/json",
                    },
                    signal: controller.signal,
                });
                if (response.ok) {
                    break;
                }
                lastError = `${response.status} ${await response.text()}`;
            } catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
            } finally {
                clearTimeout(timeout);
            }
            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
            }
        }

        if (!response || !response.ok) {
            throw new BadRequestException(`Failed to get ElevenLabs signed URL: ${lastError ?? "unknown error"}`);
        }

        const data = (await response.json()) as { signed_url?: string; conversation_id?: string };
        const signedUrl = data.signed_url;
        if (!signedUrl || typeof signedUrl !== "string") {
            throw new BadRequestException("Invalid ElevenLabs signed URL response.");
        }

        this.logger.log(
            [
                "elevenlabs.signed_url.success",
                `session=${params?.interviewSessionId ?? "none"}`,
                `agent=${resolvedAgentId}`,
                `attempt=${attempt}`,
                `ms=${Date.now() - startedAt}`,
            ].join(" ")
        );

        // ElevenLabs signed URLs are valid for 15 minutes.
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        return {
            signed_url: signedUrl,
            conversation_id: data.conversation_id,
            expires_at: expiresAt,
        };
    }
}
