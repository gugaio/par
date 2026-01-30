#!/usr/bin/env node

import { start } from '@par/server';
import { config } from 'dotenv';

config();

async function main(): Promise<void> {
  try {
    await start();
  } catch (error) {
    console.error('Failed to start PAR server:', error);
    process.exit(1);
  }
}

main();
