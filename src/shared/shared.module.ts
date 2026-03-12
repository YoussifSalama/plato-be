import { Global, Module } from '@nestjs/common';
import { OpenAiService } from './services/openai.service';
import { BcryptService } from './services/bcrypt.services';
import { JwtService } from './services/jwt.services';
import { TwilioVoiceService } from './services/twilio-voice.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AwsS3Service } from './helpers/aws/s3/s3.service';

@Global()
@Module({
    providers: [OpenAiService, BcryptService, JwtService, TwilioVoiceService, GoogleAuthService, AwsS3Service],
    exports: [OpenAiService, BcryptService, JwtService, TwilioVoiceService, GoogleAuthService, AwsS3Service],
})
export class SharedModule { }
