/**
 * Test helpers for Matter server startup initialization tests
 * Provides reusable mock factories and event capture utilities
 */

import type { TrainStatusDevice, StatusChangeEvent } from '../../src/devices/trainStatusDevice.js';

/**
 * Factory for creating mock RTT API responses
 * Based on actual RTT API response structure from tests/examples/search.json
 */
export class MockTrainFactory {
  /**
   * Create a mock RTT API response with specified delay
   * @param delayMinutes - Delay in minutes (0 = on time, positive = late)
   * @returns Mock RTT API response matching real API structure
   */
  createMockRTTResponse(delayMinutes: number) {
    const now = new Date();
    // Schedule train to depart 30 minutes from now (within default 20-80 minute window)
    const scheduledTime = new Date(now.getTime() + 30 * 60000);
    const scheduledHHMM = scheduledTime.toTimeString().slice(0, 5).replace(':', '');

    // Calculate arrival time (45 minute journey)
    const arrivalTime = new Date(scheduledTime.getTime() + 45 * 60000);
    const arrivalHHMM = arrivalTime.toTimeString().slice(0, 5).replace(':', '');

    // Calculate realtime departure with delay
    const realtimeTime = new Date(scheduledTime.getTime() + delayMinutes * 60000);
    const realtimeHHMM = realtimeTime.toTimeString().slice(0, 5).replace(':', '');

    return {
      location: {
        name: 'Cambridge',
        crs: 'CBG',
        tiploc: 'CAMBDGE',
        country: 'gb',
        system: 'nr',
      },
      filter: {
        destination: {
          name: 'London Kings Cross',
          crs: 'KGX',
          tiploc: 'KNGX',
          country: 'gb',
          system: 'nr',
        },
      },
      services: [
        {
          locationDetail: {
            realtimeActivated: true,
            tiploc: 'CAMBDGE',
            crs: 'CBG',
            description: 'Cambridge',
            gbttBookedDeparture: scheduledHHMM,
            realtimeDeparture: realtimeHHMM,
            realtimeDepartureActual: false,
            realtimeGbttDepartureLateness: delayMinutes,
            origin: [
              {
                tiploc: 'CAMBDGE',
                description: 'Cambridge',
                workingTime: scheduledHHMM + '00',
                publicTime: scheduledHHMM,
              },
            ],
            destination: [
              {
                tiploc: 'KNGX',
                description: 'London Kings Cross',
                workingTime: arrivalHHMM + '00',
                publicTime: arrivalHHMM,
              },
            ],
            isCall: true,
            isPublicCall: true,
            platform: '2',
            platformConfirmed: true,
            platformChanged: false,
          },
          serviceUid: 'TEST123',
          runDate: now.toISOString().split('T')[0],
          trainIdentity: '1A23',
          runningIdentity: '1A23',
          atocCode: 'GR',
          atocName: 'Great Northern',
          serviceType: 'train',
          isPassenger: true,
        },
      ],
    };
  }

  /**
   * Create expected air quality mapping for delay
   * @param delayMinutes - Delay in minutes
   * @returns Expected air quality value (1-5)
   */
  getExpectedAirQuality(delayMinutes: number): number {
    if (delayMinutes <= 2) return 1; // Good
    if (delayMinutes <= 5) return 2; // Fair
    if (delayMinutes <= 10) return 3; // Moderate
    return 5; // Poor (>10 minutes)
  }

  /**
   * Get expected air quality name for delay
   */
  getExpectedAirQualityName(delayMinutes: number): string {
    const quality = this.getExpectedAirQuality(delayMinutes);
    const names = ['Unknown', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    return names[quality] ?? 'Unknown';
  }

  /**
   * Get expected air quality color for delay
   */
  getExpectedAirQualityColor(delayMinutes: number): string {
    const quality = this.getExpectedAirQuality(delayMinutes);
    const colors = ['Unknown', 'Green', 'Yellow', 'Orange', 'Red', 'Purple'];
    return colors[quality] ?? 'Unknown';
  }
}

/**
 * Setup and management for Matter server and RTT API mocks
 */
export class MatterServerMockSetup {
  private initSequence: string[];
  private mockRTTResponses: Map<string | number, unknown>;
  private rttSearchMock: jest.Mock;
  private startMatterServerMock: jest.Mock;

  constructor(
    initSequence: string[],
    mockRTTResponses: Map<string | number, unknown>,
    rttSearchMock: jest.Mock,
    startMatterServerMock: jest.Mock
  ) {
    this.initSequence = initSequence;
    this.mockRTTResponses = mockRTTResponses;
    this.rttSearchMock = rttSearchMock;
    this.startMatterServerMock = startMatterServerMock;
  }

  /**
   * Setup all mocks for Matter server initialization tests
   */
  setupMocks(): void {
    // Setup RTT API mock to return pre-configured responses
    this.rttSearchMock.mockImplementation(async () => {
      const response = this.mockRTTResponses.get('current');
      if (!response) {
        throw new Error('RTT API not configured for test');
      }
      return response;
    });

    // Setup Matter server mock to replicate exact initialization sequence
    this.startMatterServerMock.mockImplementation(async (device: TrainStatusDevice) => {
      // Track that Matter server initialization was called
      this.initSequence.push('Matter server start called');

      // Create lightweight endpoint mocks matching original structure
      const createEndpoint = () => ({
        act: jest.fn(async (callback: (agent: unknown) => Promise<void>) => {
          await callback({
            temperatureMeasurement: { setDelayMinutes: jest.fn() },
            modeSelect: { setTrainStatus: jest.fn() },
            airQuality: { setAirQuality: jest.fn() },
          });
        }),
      });

      const mockServer = {
        node: {
          close: jest.fn(async () => {}),
          run: jest.fn(async () => {}),
        },
        tempSensor: createEndpoint(),
        modeDevice: createEndpoint(),
        airQualityDevice: createEndpoint(),
        close: jest.fn(async () => {}),
      };

      // CRITICAL: Attach event listeners BEFORE returning
      // This replicates the exact behavior from MatterServer.ts
      if (device) {
        device.on('statusChange', async (status: StatusChangeEvent) => {
          this.initSequence.push('Event handler called');
          // Simulate updating all endpoints (like real MatterServer.ts does)
          if (mockServer.tempSensor) {
            await mockServer.tempSensor.act(async (agent: any) => {
              await agent.temperatureMeasurement?.setDelayMinutes?.(status.delayMinutes);
            });
          }
          if (mockServer.modeDevice) {
            await mockServer.modeDevice.act(async (agent: any) => {
              await agent.modeSelect?.setTrainStatus?.(status.trainStatus);
            });
          }
          if (mockServer.airQualityDevice) {
            await mockServer.airQualityDevice.act(async (agent: any) => {
              // Import STATUS_TO_AIR_QUALITY mapping
              const STATUS_TO_AIR_QUALITY: Record<string, number> = {
                on_time: 1,
                minor_delay: 2,
                delayed: 3,
                major_delay: 4,
                unknown: 0,
              };
              const airQuality = STATUS_TO_AIR_QUALITY[status.trainStatus] ?? 0;
              await agent.airQuality?.setAirQuality?.(airQuality);
            });
          }
        });
      }

      // Track that initialization is complete
      this.initSequence.push('Matter server initialized');

      return mockServer;
    });
  }

  /**
   * Register a mock response for a specific delay or key
   */
  registerMockResponse(key: string | number, response: unknown): void {
    this.mockRTTResponses.set(key, response);
  }
}

/**
 * Captures and tracks status change events from TrainStatusDevice
 */
export class StatusEventCapture {
  public capturedEvents: StatusChangeEvent[] = [];
  public eventLog: Array<{
    timestamp: Date;
    event: string;
    mode: number;
    delay: number | null;
  }> = [];

  /**
   * Reset all captured data
   */
  reset(): void {
    this.capturedEvents = [];
    this.eventLog = [];
  }

  /**
   * Attach event listeners to device to capture status changes
   */
  captureFrom(device: TrainStatusDevice): void {
    device.on('statusChange', (status: StatusChangeEvent) => {
      this.eventLog.push({
        timestamp: new Date(),
        event: 'statusChange',
        mode: status.currentMode,
        delay: status.delayMinutes,
      });
      this.capturedEvents.push(status);
    });
  }

  /**
   * Get the most recent captured event
   */
  getLatest(): StatusChangeEvent | undefined {
    return this.capturedEvents[this.capturedEvents.length - 1];
  }

  /**
   * Get count of captured events
   */
  getCount(): number {
    return this.capturedEvents.length;
  }

  /**
   * Check if any events were captured
   */
  hasEvents(): boolean {
    return this.capturedEvents.length > 0;
  }
}

/**
 * Console logger mock for capturing log messages during tests
 */
export class ConsoleLogCapture {
  private originalLog?: (...args: unknown[]) => void;
  public logMessages: string[] = [];

  /**
   * Start capturing console.log messages
   */
  start(): void {
    if (!this.originalLog) {
      this.originalLog = console.log;
    }
    console.log = (...args: unknown[]) => {
      this.logMessages.push(args.join(' '));
      this.originalLog?.(...args);
    };
  }

  /**
   * Stop capturing and restore original console.log
   */
  stop(): void {
    if (this.originalLog) {
      console.log = this.originalLog;
      this.originalLog = undefined;
    }
  }

  /**
   * Reset captured messages
   */
  reset(): void {
    this.logMessages = [];
  }

  /**
   * Get all captured messages
   */
  getMessages(): string[] {
    return this.logMessages;
  }
}
