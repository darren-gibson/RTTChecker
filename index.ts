import { TrainStatusDevice } from './src/devices/trainStatusDevice.js';
import { startMatterServer } from './src/runtime/matterServer.js';
import { isTestEnv, validateConfig } from './src/config.js';
import { log } from './src/utils/logger.js';

/**
 * Matter Train Status Device
 * Reports train punctuality and can be commissioned by Google Home
 */

// Create the device instance
const device = new TrainStatusDevice();

// Export device for testing
export { device };

// Start device only when not in test environment
if (!isTestEnv()) {
  // Validate configuration early
  try {
    validateConfig();
  } catch (error) {
    log.error((error as Error).message);
    process.exit(1);
  }

  log.info('🚆 Starting Matter Train Status Device...');
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const deviceInfo = device.getDeviceInfo();
  log.info('Device Information:');
  log.info(`  Name: ${deviceInfo.deviceName}`);
  log.info(`  Vendor: ${deviceInfo.vendorName}`);
  log.info(`  Product: ${deviceInfo.productName}`);
  log.info(`  Serial: ${deviceInfo.serialNumber}`);
  log.info('');

  // Emit a debug message for runtime verification. Should only appear when LOG_LEVEL=debug.
  log.debug('🔧 Debug verification: this should be hidden unless LOG_LEVEL=debug');

  // Start Matter server for Google Home integration
  let matterServer: Awaited<ReturnType<typeof startMatterServer>> | undefined;
  startMatterServer(device)
    .then((server) => {
      matterServer = server;
      log.info('🎯 Device ready! Monitor train status updates below:\n');

      // Start periodic status updates AFTER Matter server is ready
      // This ensures the first status update can be received by the endpoints
      device.startPeriodicUpdates();

      // Emit explicit ready signal for test environments
      // Tests can wait for this marker instead of using arbitrary timeouts
      // Write directly to stderr (fd 2) to avoid logger interference
      if (process.env['EMIT_READY_SIGNAL'] === 'true') {
        process.stderr.write('__READY__\n');
      }
    })
    .catch((error) => {
      log.error('❌ Failed to start Matter server:', error);

      // Emit failure signal for test environments
      if (process.env['EMIT_READY_SIGNAL'] === 'true') {
        process.stderr.write('__FAILED__\n');
      }

      process.exit(1);
    });

  // Handle graceful shutdown
  const shutdown = async () => {
    log.info('\n\n🛑 Shutting down gracefully...');
    device.stopPeriodicUpdates();

    if (matterServer) {
      try {
        await matterServer.close();
        log.info('✅ Matter server closed');
      } catch (err) {
        log.error('Error closing Matter server:', err);
      }
    }

    log.info('👋 Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Allow short-lived runs for CI / manual verification using EXIT_AFTER_MS.
  const exitAfterMs = parseInt(process.env['EXIT_AFTER_MS'] || '', 10);
  if (!Number.isNaN(exitAfterMs) && exitAfterMs > 0) {
    setTimeout(() => {
      log.info(`⏱ Exiting after ${exitAfterMs}ms (EXIT_AFTER_MS) for verification.`);
      shutdown();
    }, exitAfterMs);
  }
}
