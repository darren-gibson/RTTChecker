/**
 * Configuration type definitions
 * @module config/types
 */

export interface RTTConfig {
  user?: string;
  pass?: string;
}

export interface TrainConfig {
  originTiploc: string | null;
  destTiploc: string | null;
  minAfterMinutes: number;
  windowMinutes: number;
}

export interface ServerConfig {
  port: number;
  nodeEnv?: string;
}

export type PrimaryEndpoint = 'mode' | 'airQuality';

export interface MatterConfig {
  deviceName: string;
  vendorName: string;
  productName: string;
  serialNumber: string;
  discriminator: number;
  passcode: number;
  useBridge: boolean;
  primaryEndpoint: PrimaryEndpoint;
  statusDeviceName?: string;
  delayDeviceName?: string;
  airQualityDeviceName?: string;
}

export interface Config {
  rtt: RTTConfig;
  train: TrainConfig;
  server: ServerConfig;
  matter: MatterConfig;
}
