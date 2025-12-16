import { 
    Controller, 
    Post, 
    UploadedFile, 
    UseInterceptors, 
    Req, 
    UseGuards 
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
  import { UploadService } from './upload.service';
  
  @Controller('upload')
  export class UploadController {
    constructor(private uploadService: UploadService) {}
  
    @UseGuards(SupabaseAuthGuard)
    @Post('avatar')
    @UseInterceptors(FileInterceptor('file'))
    async uploadAvatar(
      @UploadedFile() file: Express.Multer.File,
      @Req() req
    ) {
      const userId = req.app_users.id;
      const url = await this.uploadService.uploadAvatar(file, userId);
      return { success: true, url };
    }
  
    @UseGuards(SupabaseAuthGuard)
    @Post('banner')
    @UseInterceptors(FileInterceptor('file'))
    async uploadBanner(
      @UploadedFile() file: Express.Multer.File,
      @Req() req
    ) {
      const userId = req.app_users.id;
      const url = await this.uploadService.uploadBanner(file, userId);
      return { success: true, url };
    }
  }
  