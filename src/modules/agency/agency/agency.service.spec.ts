import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { BcryptService } from 'src/shared/services/bcrypt.services';
import { SendGridService } from 'src/shared/services/sendgrid.services';
import { JwtService } from 'src/shared/services/jwt.services';
import { GoogleAuthService } from 'src/shared/services/google-auth.service';
import { StripeService } from 'src/modules/stripe/stripe.service';
import { AgencyService } from './agency.service';

describe('AgencyService', () => {
  let service: AgencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgencyService,
        { provide: PrismaService, useValue: {} },
        { provide: BcryptService, useValue: {} },
        { provide: SendGridService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: GoogleAuthService, useValue: {} },
        { provide: StripeService, useValue: {} },
      ],
    }).compile();

    service = module.get<AgencyService>(AgencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
