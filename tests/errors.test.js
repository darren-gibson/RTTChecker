import { 
  RTTCheckerError, 
  RTTApiError, 
  NoTrainFoundError, 
  ConfigurationError,
  InvalidTrainDataError 
} from '../src/errors.js';

describe('RTTCheckerError', () => {
  test('creates error with message and context', () => {
    const error = new RTTCheckerError('Test error', { 
      context: { foo: 'bar' } 
    });
    
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

describe('RTTApiError', () => {
  test('creates API error with status code', () => {
    const error = new RTTApiError('Request failed', {
      statusCode: 502,
      endpoint: 'https://api.example.com/data',
      responseBody: 'Bad Gateway'
    });
    
    expect(error).toBeInstanceOf(RTTCheckerError);
    expect(error.name).toBe('RTTApiError');
    expect(error.statusCode).toBe(502);
    expect(error.endpoint).toBe('https://api.example.com/data');
    expect(error.responseBody).toBe('Bad Gateway');
  });

  test('identifies auth errors (401)', () => {
    const error = new RTTApiError('Unauthorized', { statusCode: 401 });
    expect(error.isAuthError()).toBe(true);
    expect(error.isRetryable()).toBe(false);
  });

  test('identifies auth errors (403)', () => {
    const error = new RTTApiError('Forbidden', { statusCode: 403 });
    expect(error.isAuthError()).toBe(true);
  });

  test('identifies retryable errors (5xx)', () => {
    const error502 = new RTTApiError('Bad Gateway', { statusCode: 502 });
    const error503 = new RTTApiError('Service Unavailable', { statusCode: 503 });
    
    expect(error502.isRetryable()).toBe(true);
    expect(error502.isAuthError()).toBe(false);
    expect(error503.isRetryable()).toBe(true);
  });

  test('identifies network errors as retryable', () => {
    const error = new RTTApiError('Network error', {}); // No statusCode
    expect(error.isRetryable()).toBe(true);
  });

  test('non-retryable client errors (4xx)', () => {
    const error = new RTTApiError('Bad Request', { statusCode: 400 });
    expect(error.isRetryable()).toBe(false);
    expect(error.isAuthError()).toBe(false);
  });

  test('serializes with API-specific fields', () => {
    const error = new RTTApiError('Failed', {
      statusCode: 500,
      endpoint: 'https://api.test.com'
    });
    const json = error.toJSON();
    
    expect(json.statusCode).toBe(500);
    expect(json.endpoint).toBe('https://api.test.com');
    expect(json.isAuthError).toBe(false);
    expect(json.isRetryable).toBe(true);
  });
});

describe('NoTrainFoundError', () => {
  test('creates error with search parameters', () => {
    const error = new NoTrainFoundError('No trains available', {
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      searchWindow: { start: 500, end: 560 },
      candidateCount: 3
    });
    
    expect(error).toBeInstanceOf(RTTCheckerError);
    expect(error.name).toBe('NoTrainFoundError');
    expect(error.originTiploc).toBe('CAMBDGE');
    expect(error.destTiploc).toBe('KNGX');
    expect(error.searchWindow).toEqual({ start: 500, end: 560 });
    expect(error.candidateCount).toBe(3);
  });

  test('defaults candidateCount to 0', () => {
    const error = new NoTrainFoundError('No trains', {
      originTiploc: 'TEST',
      destTiploc: 'DEST'
    });
    expect(error.candidateCount).toBe(0);
  });

  test('serializes with search details', () => {
    const error = new NoTrainFoundError('Not found', {
      originTiploc: 'A',
      destTiploc: 'B',
      candidateCount: 5
    });
    const json = error.toJSON();
    
    expect(json.originTiploc).toBe('A');
    expect(json.destTiploc).toBe('B');
    expect(json.candidateCount).toBe(5);
  });
});

describe('ConfigurationError', () => {
  test('creates error with missing fields', () => {
    const error = new ConfigurationError('Config invalid', {
      missingFields: ['RTT_USER', 'RTT_PASS'],
      invalidFields: []
    });
    
    expect(error).toBeInstanceOf(RTTCheckerError);
    expect(error.name).toBe('ConfigurationError');
    expect(error.missingFields).toEqual(['RTT_USER', 'RTT_PASS']);
    expect(error.invalidFields).toEqual([]);
  });

  test('creates error with invalid fields', () => {
    const error = new ConfigurationError('Bad config', {
      missingFields: [],
      invalidFields: ['UPDATE_INTERVAL_MS']
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
      invalidFields: ['TIMEOUT']
    });
    const json = error.toJSON();
    
    expect(json.missingFields).toEqual(['API_KEY']);
    expect(json.invalidFields).toEqual(['TIMEOUT']);
  });
});

describe('InvalidTrainDataError', () => {
  test('creates error with data details', () => {
    const error = new InvalidTrainDataError('Missing field', {
      serviceId: 'W12345',
      missingField: 'locationDetail'
    });
    
    expect(error).toBeInstanceOf(RTTCheckerError);
    expect(error.name).toBe('InvalidTrainDataError');
    expect(error.serviceId).toBe('W12345');
    expect(error.missingField).toBe('locationDetail');
  });

  test('serializes with data details', () => {
    const error = new InvalidTrainDataError('Invalid', {
      serviceId: 'ABC123',
      missingField: 'destination'
    });
    const json = error.toJSON();
    
    expect(json.serviceId).toBe('ABC123');
    expect(json.missingField).toBe('destination');
  });
});
