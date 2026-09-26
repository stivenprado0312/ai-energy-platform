import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ImportModule } from './infrastructure/import/import.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MetersModule } from './modules/meters/meters.module';
import { ReadingsModule } from './modules/readings/readings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ImportModule,
    MetersModule,
    ReadingsModule,
    DashboardModule,
  ],
})
export class AppModule {}
