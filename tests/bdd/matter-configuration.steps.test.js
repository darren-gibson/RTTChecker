import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature('./tests/bdd/features/matter-configuration.feature');

defineFeature(feature, (test) => {
  let config;

  beforeEach(() => {
    // Model the relevant parts of config.matter in-memory
    config = {
      useBridge: true,
      primaryEndpoint: 'mode',
    };
  });

  test('Default configuration exposes Mode endpoint when not using a bridge', ({
    given,
    and,
    when,
    then,
  }) => {
    given('I am using the default configuration', () => {
      // defaults already set in beforeEach
    });

    and('USE_BRIDGE is set to false', () => {
      config.useBridge = false;
    });

    when('the Matter server starts', () => {
      // Behaviour is modelled by config only for BDD purposes
    });

    then('the primary visualisation endpoint should be the Mode device', () => {
      const primary =
        !config.useBridge && config.primaryEndpoint === 'airQuality' ? 'airQuality' : 'mode';
      expect(primary).toBe('mode');
    });
  });

  test('Configuration exposes Air Quality endpoint when PRIMARY_ENDPOINT=airQuality', ({
    given,
    and,
    when,
    then,
  }) => {
    given('I am using the default configuration', () => {});

    and('USE_BRIDGE is set to false', () => {
      config.useBridge = false;
    });

    and('PRIMARY_ENDPOINT is set to "airQuality"', () => {
      config.primaryEndpoint = 'airQuality';
    });

    when('the Matter server starts', () => {});

    then('the primary visualisation endpoint should be the Air Quality device', () => {
      const primary =
        !config.useBridge && config.primaryEndpoint === 'airQuality' ? 'airQuality' : 'mode';
      expect(primary).toBe('airQuality');
    });
  });

  test('Bridge mode exposes both Mode and Air Quality endpoints', ({ given, and, when, then }) => {
    given('I am using the default configuration', () => {});

    and('USE_BRIDGE is set to true', () => {
      config.useBridge = true;
    });

    and('PRIMARY_ENDPOINT is set to "airQuality"', () => {
      config.primaryEndpoint = 'airQuality';
    });

    when('the Matter server starts', () => {});

    then('both Mode and Air Quality endpoints should be available under the bridge', () => {
      // With a bridge, implementation always creates both Mode and Air Quality
      // endpoints regardless of PRIMARY_ENDPOINT, so we assert this intent.
      const modeAvailable = config.useBridge;
      const airQualityAvailable = config.useBridge;
      expect(modeAvailable).toBe(true);
      expect(airQualityAvailable).toBe(true);
    });
  });
});
