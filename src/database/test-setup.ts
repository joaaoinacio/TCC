import 'reflect-metadata';
import { config } from 'dotenv';
import { TestDataSource } from './data-source.test';

config();

export default async function globalSetup(): Promise<void> {
  await TestDataSource.initialize();
  await TestDataSource.destroy();
  console.log('\n[Test] Database schema synchronized on tcc_db_test');
}
