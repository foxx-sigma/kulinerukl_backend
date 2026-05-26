import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CulinaryModule } from './culinary/culinary.module';
import { CategoriesModule } from './categories/categories.module';
import { MenusModule } from './menus/menus.module';
import { ReviewsModule } from './reviews/reviews.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CulinaryModule,
    CategoriesModule,
    MenusModule,
    ReviewsModule,
    BookmarksModule,
    OrdersModule,
    PaymentsModule,
  ],
})
export class AppModule {}
