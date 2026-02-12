import { Module } from "@nestjs/common";
import { CandidateController } from "./candidate.controller";
import { CandidateService } from "./candidate.service";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { BcryptService } from "src/shared/services/bcrypt.services";
import { JwtService } from "src/shared/services/jwt.services";
import { CandidateJwtAuthGuard } from "src/shared/guards/candidate-jwt-auth.guard";
import { EmailModule } from "src/shared/services/email.module";

@Module({
    imports: [PrismaModule, EmailModule],
    controllers: [CandidateController],
    providers: [CandidateService, BcryptService, JwtService, CandidateJwtAuthGuard],
})
export class CandidateModule { }

