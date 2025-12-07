import qr from 'qrcode-terminal';

export function printCommissioningInfo(node, log, config) {
  const { qrPairingCode, manualPairingCode } = node.state.commissioning.pairingCodes;
  log.info('📱 Commissioning information:');
  log.info(`   Discriminator: ${config.matter.discriminator}`);
  log.info(`   Passcode: ${config.matter.passcode}`);
  log.info(`   Manual pairing code: ${manualPairingCode}`);
  log.info('');
  log.info('🔳 Scan QR code with Google Home app:');
  qr.generate(qrPairingCode, { small: true }, (qrCode) => {
    log.info('\n' + qrCode);
  });
}
