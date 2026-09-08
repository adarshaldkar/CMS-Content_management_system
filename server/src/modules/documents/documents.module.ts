import { Module } from '@nestjs/common';
import { DocumentImportService } from './document-import.service';
import { GutenbergAdapterService } from './gutenberg-adapter.service';
import { PdfIngestionService } from './pdf-ingestion.service';
import { DocumentImportController } from './document-import.controller';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [DocumentImportController],
  providers: [DocumentImportService, GutenbergAdapterService, PdfIngestionService],
  exports: [DocumentImportService, GutenbergAdapterService, PdfIngestionService],
})
export class DocumentsModule {}
