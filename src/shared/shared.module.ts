import { Global, Module } from '@nestjs/common';
import { OpenAiService } from './services/openai.service';
import { BcryptService } from './services/bcrypt.services';
import { JwtService } from './services/jwt.services';
import { TwilioVoiceService } from './services/twilio-voice.service';
import { GoogleAuthService } from './services/google-auth.service';

@Global()
@Module({
    providers: [OpenAiService, BcryptService, JwtService, TwilioVoiceService, GoogleAuthService],
    exports: [OpenAiService, BcryptService, JwtService, TwilioVoiceService, GoogleAuthService],
})
export class SharedModule { }
