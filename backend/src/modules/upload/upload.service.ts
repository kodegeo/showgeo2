import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UploadService {
  constructor(private supabaseService: SupabaseService) {}

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    const client = this.supabaseService.client;

    const path = `users/${userId}/avatar-${Date.now()}.${file.originalname.split('.').pop()}`;

    const { data, error } = await client.storage
      .from('showgeo-assets')
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrl } = client.storage.from('showgeo-assets').getPublicUrl(path);
    return publicUrl.publicUrl;
  }

  async uploadBanner(file: Express.Multer.File, userId: string) {
    const client = this.supabaseService.client;

    const path = `users/${userId}/banner-${Date.now()}.${file.originalname.split('.').pop()}`;

    const { data, error } = await client.storage
      .from('showgeo-assets')
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrl } = client.storage.from('showgeo-assets').getPublicUrl(path);
    return publicUrl.publicUrl;
  }
}


