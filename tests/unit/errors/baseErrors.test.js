import { RTTCheckerError, ConfigurationError } from '../../../src/errors.js';

describe('RTTCheckerError', () => {
  test('creates error with message and context', () => {
    const error = new RTTCheckerError('Test error', { context: { foo: 'bar' } });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RTTCheckerError');
    expect(error.message).toBe('Test error');
    expect(error.context).toEqual({ foo: 'bar' });
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  test('serializes to JSON', () => {
    const error = new RTTCheckerError('Test', { context: { x: 1 } });
    const json = error.toJSON();
    expect(json.name).toBe('RTTCheckerError');
    expect(json.message).toBe('Test');
    expect(json.context).toEqual({ x: 1 });
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });

  test('defaults to empty context', () => {
    const error = new RTTCheckerError('Test');
    expect(error.context).toEqual({});
  });
});

describe('ConfigurationError', () => {
  test('creates error with missing fields', () => {
    const error = new ConfigurationError('Config invalid', {
      missingFields: ['RTT_USER', 'RTT_PASS'],
      invalidFields: [],
    });
    expect(error).toBeInstanceOf(RTTCheckerError);
    expect(error.name).toBe('ConfigurationError');
    expect(error.missingFields).toEqual(['RTT_USER', 'RTT_PASS']);
    expect(error.invalidFields).toEqual([]);
  });

  test('creates error with invalid fields', () => {
    const error = new ConfigurationError('Bad config', {
      missingFields: [],
      invalidFields: ['UPDATE_INTERVAL_MS'],
    });
    expect(error.invalidFields).toEqual(['UPDATE_INTERVAL_MS']);
  });

  test('defaults to empty arrays', () => {
    const error = new ConfigurationError('Error');
    expect(error.missingFields).toEqual([]);
    expect(error.invalidFields).toEqual([]);
  });

  test('serializes with config details', () => {
    const error = new ConfigurationError('Failed', {
      missingFields: ['API_KEY'],
      invalidFields: ['TIMEOUT'],
    });
    const json = error.toJSON();
    expect(json.missingFields).toEqual(['API_KEY']);
    expect(json.invalidFields).toEqual(['TIMEOUT']);
  });
});
