import { RTTCheckerError } from '../../../src/errors.js';
import { RTTApiError } from '../../../src/api/errors.js';

describe('RTTApiError', () => {
  test('creates API error with status code', () => {
    const error = new RTTApiError('Request failed', {
      statusCode: 502,
      endpoint: 'https://api.example.com/data',
      responseBody: 'Bad Gateway',
    });
    expect(error).toBeInstanceOf(RTTCheckerError);
    expect(error.name).toBe('RTTApiError');
    expect(error.statusCode).toBe(502);
    expect(error.endpoint).toBe('https://api.example.com/data');
    expect(error.responseBody).toBe('Bad Gateway');
  });

  test('identifies auth errors (401/403)', () => {
    const e401 = new RTTApiError('Unauthorized', { statusCode: 401 });
    const e403 = new RTTApiError('Forbidden', { statusCode: 403 });
    expect(e401.isAuthError()).toBe(true);
    expect(e403.isAuthError()).toBe(true);
    expect(e401.isRetryable()).toBe(false);
  });

  test('retryable errors (5xx) and network)', () => {
    const e502 = new RTTApiError('Bad Gateway', { statusCode: 502 });
    const e503 = new RTTApiError('Service Unavailable', { statusCode: 503 });
    const eNet = new RTTApiError('Network error', {});
    expect(e502.isRetryable()).toBe(true);
    expect(e503.isRetryable()).toBe(true);
    expect(eNet.isRetryable()).toBe(true);
  });

  test('non-retryable client errors (4xx)', () => {
    const e400 = new RTTApiError('Bad Request', { statusCode: 400 });
    expect(e400.isRetryable()).toBe(false);
    expect(e400.isAuthError()).toBe(false);
  });

  test('serializes with API-specific fields', () => {
    const error = new RTTApiError('Failed', {
      statusCode: 500,
      endpoint: 'https://api.test.com',
    });
    const json = error.toJSON();
    expect(json['statusCode']).toBe(500);
    expect(json['endpoint']).toBe('https://api.test.com');
    expect(json['isAuthError']).toBe(false);
    expect(json['isRetryable']).toBe(true);
  });
});
