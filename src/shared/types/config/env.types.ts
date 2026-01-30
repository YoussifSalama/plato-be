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
    apiKey: string;
  };
  sendGrid: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  mailGun: {
    enabled: boolean;
    apiKey: string;
    domain: string;
    fromEmail: string;
    fromName: string;
  }
  frontendUrl: string;
}
