import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Mailgun from "mailgun.js";
import FormData from "form-data";

type MailgunClient = {
    messages: {
        create: (domain: string, data: { to: string | string[]; from: string; subject: string; text?: string; html?: string }) => Promise<unknown>;
    };
};

@Injectable()
export class MailGunService {
    private readonly logger = new Logger(MailGunService.name);
    private readonly apiKey: string;
    private readonly domain: string;
    private readonly fromEmail: string;
    private readonly fromName: string;
    private readonly enabled: boolean;
    private readonly client: MailgunClient | null;

    constructor(private readonly config: ConfigService) {
        this.apiKey = this.config.get<string>("env.mailGun.apiKey") ?? "";
        this.domain = this.config.get<string>("env.mailGun.domain") ?? "";
        this.fromEmail = this.config.get<string>("env.mailGun.fromEmail") ?? "";
        this.fromName = this.config.get<string>("env.mailGun.fromName") ?? "";
        this.enabled = this.config.get<boolean>("env.mailGun.enabled") ?? true;
        this.logger.log(
            `Mailgun config loaded: key=${this.apiKey ? "set" : "missing"} ` +
            `domain=${this.domain ? "set" : "missing"} ` +
            `fromEmail=${this.fromEmail ? "set" : "missing"} ` +
            `fromName=${this.fromName ? "set" : "missing"} ` +
            `enabled=${this.enabled ? "true" : "false"}`
        );
        if (this.enabled && this.apiKey) {
            const mailgun = new Mailgun(FormData);
            this.client = mailgun.client({ username: "api", key: this.apiKey }) as MailgunClient;
        } else {
            this.client = null;
        }
    }

    async sendEmail(to: string, subject: string, text?: string, html?: string) {
        const isProd = this.config.get<string>("env.nodeEnv") === "production";
        if (!this.enabled) {
            this.logger.warn("Mailgun is disabled. Skipping email send.");
            return;
        }
        if (!this.apiKey || !this.domain || !this.fromEmail) {
            const message = !this.apiKey
                ? "Mailgun API key not configured."
                : !this.domain
                    ? "Mailgun domain not configured."
                    : "Mailgun sender email not configured.";
            if (!isProd) {
                this.logger.warn(`${message} Skipping email in non-production.`);
                return;
            }
            throw new BadRequestException(message);
        }
        if (!text && !html) {
            throw new BadRequestException("Email content is required.");
        }
        if (!this.client) {
            if (!isProd) {
                this.logger.warn("Mailgun client not initialized. Skipping email in non-production.");
                return;
            }
            throw new BadRequestException("Mailgun client not initialized.");
        }
        const from = this.fromName
            ? `${this.fromName} <${this.fromEmail}>`
            : this.fromEmail;
        try {
            await this.client.messages.create(this.domain, {
                from,
                to,
                subject,
                text,
                html,
            });
        } catch (error) {
            this.logger.error("Failed to send email via Mailgun.", error as Error);
            if (!isProd) {
                return;
            }
            throw new BadRequestException("Failed to send email.");
        }
    }
}

