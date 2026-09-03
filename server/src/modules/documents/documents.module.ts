import { Module } from '@nestjs/common';
import { DocumentImportService } from './document-import.service';
import { DocumentImportController } from './document-import.controller';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [DocumentImportController],
  providers: [DocumentImportService],
  exports: [DocumentImportService],
})
export class DocumentsModule {}
