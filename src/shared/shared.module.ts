import { Global, Module } from '@nestjs/common';
import { OpenAiService } from './services/openai.service';
import { BcryptService } from './services/bcrypt.services';
import { JwtService } from './services/jwt.services';

@Global()
@Module({
    providers: [OpenAiService, BcryptService, JwtService],
    exports: [OpenAiService, BcryptService, JwtService],
})
export class SharedModule { }
