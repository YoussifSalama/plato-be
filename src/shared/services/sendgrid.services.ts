import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import sgMail, { type MailDataRequired } from "@sendgrid/mail";

@Injectable()
export class SendGridService {
    private readonly logger = new Logger(SendGridService.name);
    private readonly apiKey: string;
    private readonly fromEmail: string;
    private readonly fromName: string;
    private readonly enabled: boolean;
    private readonly nodeEnv: string;

    constructor(private readonly config: ConfigService) {
        this.apiKey = this.config.get<string>("env.sendGrid.apiKey") ?? "";
        this.fromEmail = this.config.get<string>("env.sendGrid.fromEmail") ?? "";
        this.fromName = this.config.get<string>("env.sendGrid.fromName") ?? "";
        this.enabled = this.config.get<boolean>("env.sendGrid.enabled") ?? true;
        this.nodeEnv = this.config.get<string>("env.nodeEnv") ?? "development";
        this.logger.log(
            `SendGrid config loaded: key=${this.apiKey ? "set" : "missing"} ` +
            `fromEmail=${this.fromEmail ? "set" : "missing"} ` +
            `fromName=${this.fromName ? "set" : "missing"} ` +
            `enabled=${this.enabled ? "true" : "false"}`
        );
        if (this.enabled && this.apiKey) {
            sgMail.setApiKey(this.apiKey);
        }
    }

    async sendEmail(
        to: string | string[],
        subject: string,
        text?: string,
        html?: string,
    ): Promise<{ statusCode?: number; messageId?: string } | null> {
        if (!this.enabled) {
            this.logger.warn("SendGrid is disabled. Skipping email send.");
            return null;
        }
        if (!this.apiKey || !this.fromEmail) {
            const message = !this.apiKey
                ? "SendGrid API key not configured."
                : "SendGrid sender email not configured.";
            throw new BadRequestException(message);
        }
        if (!text && !html) {
            throw new BadRequestException("Email content is required.");
        }
        const from = this.fromName
            ? `${this.fromName} <${this.fromEmail}>`
            : this.fromEmail;
        const recipients = Array.isArray(to) ? to.join(", ") : to;
        try {
            const baseMessage = { to, from, subject };
            const message: MailDataRequired = html && text
                ? { ...baseMessage, html, text }
                : html
                    ? { ...baseMessage, html }
                    : { ...baseMessage, text: text ?? "" };
            this.logger.log(`SendGrid sending email: to=${recipients} subject="${subject}"`);
            const response = await sgMail.send(message);
            const statusCode = response?.[0]?.statusCode;
            const headers = response?.[0]?.headers ?? {};
            const messageId = (headers["x-message-id"] ?? headers["X-Message-Id"]) as string | undefined;
            this.logger.log(`SendGrid email sent: to=${recipients} status=${statusCode ?? "unknown"}`);
            return { statusCode, messageId };
        } catch (error) {
            const err = error as { code?: number };
            if (this.nodeEnv !== "production" && (err?.code === 401 || err?.code === 403)) {
                this.logger.warn("SendGrid unauthorized in non-production. Skipping email send.");
                return null;
            }
            this.logger.error("Failed to send email via SendGrid.", error as Error);
            throw new BadRequestException("Failed to send email.");
        }
    }
}

