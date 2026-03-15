import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class DocumentService {
    constructor(private readonly prisma: PrismaService) { }
    
    // Future home for document-related database operations if needed
}
