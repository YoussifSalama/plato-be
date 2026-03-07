export type IEnvType = "development" | "test" | "production";

export interface IOpenAiKeyConfig {
  index: number;
  envName: string;
  platoKeyId: string;
  apiKey: string;
}

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
    keys: IOpenAiKeyConfig[];
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
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
}
