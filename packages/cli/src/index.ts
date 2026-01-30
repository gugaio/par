#!/usr/bin/env node

import { config } from 'dotenv';
config();

import { checkAndConfigureApiKey } from './config';
import { start } from '@par/server';

async function main(): Promise<void> {
  try {
    await checkAndConfigureApiKey();
    await start();
  } catch (error) {
    console.error('Failed to start PAR server:', error);
    process.exit(1);
  }
}

main();
