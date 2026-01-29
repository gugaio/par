#!/usr/bin/env node

import { start } from '@par/server';

start().catch((error) => {
  console.error('Failed to start PAR server:', error);
  process.exit(1);
});