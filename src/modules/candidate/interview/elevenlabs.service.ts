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
        language?: "ar" | "en";
    }): Promise<{ signed_url: string; conversation_id?: string; expires_at: string; agent_id: string }> {
        const apiKey = this.configService.get<string>("env.elevenlabs.apiKey");
        const defaultAgentId = this.normalizeAgentId(this.configService.get<string>("env.elevenlabs.agentId"));
        const arAgentId = this.normalizeAgentId(this.configService.get<string>("env.elevenlabs.agentIdAr"));
        const enAgentId = this.normalizeAgentId(this.configService.get<string>("env.elevenlabs.agentIdEn"));
        const overrideAgentId = this.normalizeAgentId(params?.agentId);
        const languageAgentId =
            params?.language === "ar"
                ? arAgentId
                : params?.language === "en"
                    ? enAgentId
                    : undefined;
        const resolvedAgentId =
            languageAgentId ??
            overrideAgentId ??
            defaultAgentId;

        if (!apiKey) {
            throw new BadRequestException("ElevenLabs API key is not configured.");
        }
        if (!resolvedAgentId) {
            throw new BadRequestException("ElevenLabs agent ID is not configured.");
        }
        if (params?.language === "ar" && !arAgentId && defaultAgentId) {
            this.logger.warn("elevenlabs.signed_url.fallback_agent_used language=ar");
        }
        if (params?.language === "en" && !enAgentId && defaultAgentId) {
            this.logger.warn("elevenlabs.signed_url.fallback_agent_used language=en");
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
            agent_id: resolvedAgentId,
        };
    }

    async listAgents(params?: {
        pageSize?: number;
        search?: string;
        archived?: boolean;
        showOnlyOwnedAgents?: boolean;
        sortDirection?: "asc" | "desc";
        sortBy?: "name" | "created_at";
        cursor?: string;
    }) {
        const query = new URLSearchParams();
        if (params?.pageSize) query.set("page_size", String(params.pageSize));
        if (params?.search) query.set("search", params.search);
        if (typeof params?.archived === "boolean") query.set("archived", String(params.archived));
        if (typeof params?.showOnlyOwnedAgents === "boolean") {
            query.set("show_only_owned_agents", String(params.showOnlyOwnedAgents));
        }
        if (params?.sortDirection) query.set("sort_direction", params.sortDirection);
        if (params?.sortBy) query.set("sort_by", params.sortBy);
        if (params?.cursor) query.set("cursor", params.cursor);

        const url = `https://api.elevenlabs.io/v1/convai/agents${query.toString() ? `?${query.toString()}` : ""}`;
        return this.requestJson(url, { method: "GET" });
    }

    async getAgent(agentId: string) {
        if (!agentId) {
            throw new BadRequestException("Agent ID is required.");
        }
        return this.requestJson(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, { method: "GET" });
    }

    async createAgent(payload: Record<string, unknown>) {
        this.ensureAgentMutationEnabled("create");
        return this.requestJson("https://api.elevenlabs.io/v1/convai/agents/create", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async updateAgent(agentId: string, payload: Record<string, unknown>) {
        this.ensureAgentMutationEnabled("update");
        if (!agentId) {
            throw new BadRequestException("Agent ID is required.");
        }
        return this.requestJson(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    }

    private async requestJson(url: string, init: RequestInit) {
        const apiKey = this.configService.get<string>("env.elevenlabs.apiKey");
        if (!apiKey) {
            throw new BadRequestException("ElevenLabs API key is not configured.");
        }
        const response = await fetch(url, {
            ...init,
            headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
                ...(init.headers ?? {}),
            },
        });
        if (!response.ok) {
            throw new BadRequestException(
                `ElevenLabs API request failed: ${response.status} ${await response.text()}`
            );
        }
        return response.json();
    }

    private normalizeAgentId(value?: string): string | undefined {
        const normalized = value?.trim();
        return normalized ? normalized : undefined;
    }

    private ensureAgentMutationEnabled(action: "create" | "update") {
        const allowMutation = this.configService.get<boolean>("env.elevenlabs.allowAgentMutation");
        if (allowMutation) {
            return;
        }

        this.logger.warn(`elevenlabs.agent_mutation_blocked action=${action}`);
        throw new BadRequestException(
            "ElevenLabs agent mutation is disabled. Enable ELEVENLABS_ALLOW_AGENT_MUTATION=true for admin operations."
        );
    }
}
