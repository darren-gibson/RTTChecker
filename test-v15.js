#!/usr/bin/env node
import { startMatterServer } from './src/runtime/MatterServerV15.js';
import { config } from './src/config.js';

console.log('Testing MatterServerV15 implementation...');
console.log('Config:', {
  port: config.matter.port,
  passcode: config.matter.passcode,
  discriminator: config.matter.discriminator,
});

try {
  const server = await startMatterServer(null);
  console.log('✅ Server started successfully!');
  
  // Shutdown after 2 seconds for testing
  setTimeout(async () => {
    console.log('Shutting down test server...');
    await server.close();
    process.exit(0);
  }, 2000);
} catch (error) {
  console.error('❌ Server failed to start:', error);
  console.error(error.stack);
  process.exit(1);
}
