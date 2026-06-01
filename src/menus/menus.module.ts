import { Module } from '@nestjs/common';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { SupabaseStorageService } from '../common/supabase/supabase-storage.service';

@Module({
  controllers: [MenusController],
  providers: [MenusService, SupabaseStorageService],
  exports: [MenusService],
})
export class MenusModule {}
