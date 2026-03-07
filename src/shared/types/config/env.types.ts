export type IEnvType = "development" | "test" | "production";

export interface IEnvParams {
  nodeEnv: IEnvType;
  tokens: {
    access: string;
    refresh: string;
  };
  hashing: {
    passwordRounds: number;
    otpRounds: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  openai: {
    apiKeys: string[];
  };
  sendGrid: {
    enabled: boolean;
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  google: {
    agencyClientId: string;
    candidateClientId: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  frontendUrl: string;
  frontendUrlCandidate: string;
  elevenlabs: {
    apiKey: string;
    agentId?: string;
    agentIdAr: string;
    agentIdEn: string;
    webhookSecret: string;
    managedPromptVersion: string;
    allowAgentMutation: boolean;
  };
}
