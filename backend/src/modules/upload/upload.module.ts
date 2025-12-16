import { Module } from '@nestjs/common';
import { AuthModule } from "../auth/auth.module";
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
