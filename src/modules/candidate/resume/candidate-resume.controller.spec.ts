import { Test, TestingModule } from '@nestjs/testing';
import { CandidateResumeController } from './candidate-resume.controller';
import { CandidateResumeService } from './candidate-resume.service';
import { BadRequestException } from '@nestjs/common';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';

describe('CandidateResumeController', () => {
    let controller: CandidateResumeController;
    let service: CandidateResumeService;

    const mockService = {
        parseAndSaveResume: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CandidateResumeController],
            providers: [
                {
                    provide: CandidateResumeService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<CandidateResumeController>(CandidateResumeController);
        service = module.get<CandidateResumeService>(CandidateResumeService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('uploadResume', () => {
        it('should call service.parseAndSaveResume with correct parameters', async () => {
            const req = { user: { id: 1 } as AccessTokenPayload };
            const file = {
                originalname: 'cv.pdf',
                filename: 'cv-123.pdf',
                mimetype: 'application/pdf',
                size: 1024,
            } as Express.Multer.File;

            const expectedResult = { basics: { name: 'John Doe' } };
            mockService.parseAndSaveResume.mockResolvedValue(expectedResult);

            const result = await controller.uploadResume(req, file);

            expect(result).toEqual(expectedResult);
            expect(service.parseAndSaveResume).toHaveBeenCalledWith(1, file);
        });

        it('should throw BadRequestException if file is missing', async () => {
            const req = { user: { id: 1 } as AccessTokenPayload };
            await expect(controller.uploadResume(req, undefined as any)).rejects.toThrow(BadRequestException);
        });
    });
});
