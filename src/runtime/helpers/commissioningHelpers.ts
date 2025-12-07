// @ts-ignore - qrcode-terminal doesn't have types
import qr from 'qrcode-terminal';
import type { ServerNode } from '@matter/main';

import type { Logger } from '../../utils/retryableRequest.js';
import type { Config } from '../../config.js';

export function printCommissioningInfo(node: ServerNode, log: Logger, config: Config): void {
  const { qrPairingCode, manualPairingCode } = (node as any).state.commissioning.pairingCodes;
  log.info?.('📱 Commissioning information:');
  log.info?.(`   Discriminator: ${config.matter.discriminator}`);
  log.info?.(`   Passcode: ${config.matter.passcode}`);
  log.info?.(`   Manual pairing code: ${manualPairingCode}`);
  log.info?.('');
  log.info?.('🔳 Scan QR code with Google Home app:');
  qr.generate(qrPairingCode, { small: true }, (qrCode: string) => {
    log.info?.('\n' + qrCode);
  });
}
