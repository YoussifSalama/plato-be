import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ElevenLabsService } from "./elevenlabs.service";

describe("ElevenLabsService agent routing", () => {
    let service: ElevenLabsService;
    let configGetMock: jest.Mock;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        configGetMock = jest.fn((key: string) => {
            if (key === "env.elevenlabs.apiKey") return "test-api-key";
            if (key === "env.elevenlabs.agentId") return "default-agent";
            if (key === "env.elevenlabs.agentIdAr") return "ar-agent";
            if (key === "env.elevenlabs.agentIdEn") return "en-agent";
            if (key === "env.elevenlabs.allowAgentMutation") return false;
            return undefined;
        });
        service = new ElevenLabsService({
            get: configGetMock,
        } as unknown as ConfigService);

        fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ signed_url: "https://example.com/signed", conversation_id: "conv-1" }),
        } as Response);
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    it("routes Arabic sessions to ELEVENLABS_AGENT_ID_AR", async () => {
        const response = await service.getSignedUrl({ language: "ar", includeConversationId: true });
        expect(response.agent_id).toBe("ar-agent");
        const requestUrl = fetchMock.mock.calls[0][0] as string;
        expect(requestUrl).toContain("agent_id=ar-agent");
    });

    it("routes English sessions to ELEVENLABS_AGENT_ID_EN", async () => {
        const response = await service.getSignedUrl({ language: "en" });
        expect(response.agent_id).toBe("en-agent");
        const requestUrl = fetchMock.mock.calls[0][0] as string;
        expect(requestUrl).toContain("agent_id=en-agent");
    });

    it("falls back to default agent when language-specific id is missing", async () => {
        configGetMock = jest.fn((key: string) => {
            if (key === "env.elevenlabs.apiKey") return "test-api-key";
            if (key === "env.elevenlabs.agentId") return "default-agent";
            if (key === "env.elevenlabs.agentIdAr") return "";
            if (key === "env.elevenlabs.agentIdEn") return "";
            return undefined;
        });
        service = new ElevenLabsService({
            get: configGetMock,
        } as unknown as ConfigService);

        const response = await service.getSignedUrl({ language: "ar" });
        expect(response.agent_id).toBe("default-agent");
    });

    it("blocks createAgent when mutation flag is disabled", async () => {
        await expect(service.createAgent({ name: "test-agent" })).rejects.toThrow(
            "ElevenLabs agent mutation is disabled"
        );
    });

    it("allows createAgent when mutation flag is enabled", async () => {
        configGetMock = jest.fn((key: string) => {
            if (key === "env.elevenlabs.apiKey") return "test-api-key";
            if (key === "env.elevenlabs.agentId") return "default-agent";
            if (key === "env.elevenlabs.agentIdAr") return "ar-agent";
            if (key === "env.elevenlabs.agentIdEn") return "en-agent";
            if (key === "env.elevenlabs.allowAgentMutation") return true;
            return undefined;
        });
        service = new ElevenLabsService({
            get: configGetMock,
        } as unknown as ConfigService);
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ agent_id: "agent-123" }),
        } as Response);

        const response = await service.createAgent({ name: "test-agent" });
        expect(response).toEqual({ agent_id: "agent-123" });
    });
});
