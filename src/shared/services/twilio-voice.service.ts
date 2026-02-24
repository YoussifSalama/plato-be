import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';

export interface AiCallPayload {
  toPhoneNumber: string;
  candidateName?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
}

@Injectable()
export class TwilioVoiceService {
  private readonly logger = new Logger(TwilioVoiceService.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromPhoneNumber: string;
  private readonly enabled: boolean;
  private client: Twilio | null = null;

  constructor(private readonly configService: ConfigService) {
    const twilioConfig = this.configService.get<{
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    }>('env.twilio');

    this.accountSid = twilioConfig?.accountSid ?? '';
    this.authToken = twilioConfig?.authToken ?? '';
    this.fromPhoneNumber = twilioConfig?.phoneNumber ?? '';
    this.enabled = Boolean(this.accountSid && this.authToken && this.fromPhoneNumber);

    if (this.enabled) {
      this.client = twilio(this.accountSid, this.authToken);
      this.logger.log('TwilioVoiceService initialized with configured credentials.');
    } else {
      this.logger.warn(
        'TwilioVoiceService disabled: missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER.',
      );
    }
  }

  private ensureClient() {
    if (!this.enabled || !this.client) {
      throw new BadRequestException('Voice calls are not configured. Please configure Twilio credentials.');
    }
  }

  private validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Best-effort normalization to E.164 using the Twilio sender number.
   * - If already E.164, returns as is.
   * - If starts with 0 and we have a +CC... fromPhoneNumber, converts e.g. 0155... -> +20 155...
   */
  private normalizePhoneNumber(raw: string): string {
    const trimmed = raw.replace(/\s+/g, '');
    if (this.validatePhoneNumber(trimmed)) {
      return trimmed;
    }

    const fromMatch = this.fromPhoneNumber.match(/^\+\d{1,3}/);
    if (fromMatch && trimmed.startsWith('0')) {
      const countryCode = fromMatch[0];
      const candidate = `${countryCode}${trimmed.slice(1)}`;
      if (this.validatePhoneNumber(candidate)) {
        this.logger.log(
          `Normalizing local phone number "${raw}" to E.164 "${candidate}" using country code ${countryCode}.`,
        );
        return candidate;
      }
    }

    throw new BadRequestException(
      'Invalid phone number format. Must be in E.164 format, e.g. +201234567890.',
    );
  }

  /**
   * Place a simple outbound AI-style reminder call in Egyptian Arabic.
   * This uses Twilio <Say> with Arabic Polly voice and does not depend on webhooks.
   */
  async initiateInterviewReminderCall(payload: AiCallPayload): Promise<void> {
    this.ensureClient();

    const to = this.normalizePhoneNumber(payload.toPhoneNumber.trim());

    const candidateName = payload.candidateName?.trim() || 'حضرتك';
    const jobTitle = payload.jobTitle?.trim() || 'فرصة عمل';
    const companyName = payload.companyName?.trim() || 'الشركة';

    const greetingLine = `اهلاً يا ${candidateName}. أنا بلاتو، مساعد التوظيف من ${companyName}.`;
    const bodyLine = `حابب أفكرك بدعوة المقابلة لوظيفة ${jobTitle}. تقدر تفتح الإيميل وتشوف لينك المقابلة وتكملها في أي وقت يناسبك.`;
    const closingLine = 'لو عندك أي استفسار، تقدر ترد على الإيميل، وشكراً لوقتك.';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Zeina" language="ar-EG">${greetingLine}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Zeina" language="ar-EG">${bodyLine}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Zeina" language="ar-EG">${closingLine}</Say>
  <Hangup/>
</Response>`;

    try {
      const call = await this.client!.calls.create({
        to,
        from: this.fromPhoneNumber,
        twiml,
        record: false,
      });

      this.logger.log(
        `Interview reminder call initiated: sid=${call.sid}, to=${to}, jobTitle="${jobTitle}", company="${companyName}"`,
      );
    } catch (error) {
      const err: any = error;
      const status = err?.status ?? err?.statusCode ?? 'n/a';
      const code = err?.code ?? 'n/a';
      const message = err?.message ?? 'n/a';
      const moreInfo = err?.moreInfo ?? err?.more_info ?? 'n/a';

      this.logger.error(
        `Failed to initiate interview reminder call to ${to}. ` +
          `Twilio error status=${status}, code=${code}, message="${message}", moreInfo=${moreInfo}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (status === 401 || status === 403) {
        throw new BadRequestException(
          'Failed to initiate voice call: Twilio authentication failed (check Account SID / Auth Token).',
        );
      }

      throw new BadRequestException(
        message && message !== 'n/a'
          ? `Failed to initiate voice call: ${message}`
          : 'Failed to initiate voice call.',
      );
    }
  }
}

