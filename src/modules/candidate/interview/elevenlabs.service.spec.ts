import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsService } from './elevenlabs.service';

describe('ElevenLabsService', () => {
  let service: ElevenLabsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElevenLabsService,
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    service = module.get<ElevenLabsService>(ElevenLabsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
