import { RTTCheckerError } from '../../../src/errors.js';
import { NoTrainFoundError, InvalidTrainDataError } from '../../../src/domain/errors.js';

describe('NoTrainFoundError', () => {
  test('creates error with search parameters', () => {
    const error = new NoTrainFoundError('No trains available', {
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      searchWindow: '500-560',
      candidateCount: 3,
    });
    expect(error).toBeInstanceOf(RTTCheckerError);
    expect(error.name).toBe('NoTrainFoundError');
    expect(error.originTiploc).toBe('CAMBDGE');
    expect(error.destTiploc).toBe('KNGX');
    expect(error.searchWindow).toBe('500-560');
    expect(error.candidateCount).toBe(3);
  });

  test('defaults candidateCount to 0', () => {
    const error = new NoTrainFoundError('No trains', {
      originTiploc: 'TEST',
      destTiploc: 'DEST',
    });
    expect(error.candidateCount).toBe(0);
  });

  test('serializes with search details', () => {
    const error = new NoTrainFoundError('Not found', {
      originTiploc: 'ABC',
      destTiploc: 'XYZ',
      candidateCount: 5,
    });
    const json = error.toJSON();
    expect(json['originTiploc']).toBe('ABC');
    expect(json['destTiploc']).toBe('XYZ');
    expect(json['candidateCount']).toBe(5);
  });
});

describe('InvalidTrainDataError', () => {
  test('creates error with data details', () => {
    const error = new InvalidTrainDataError('Missing field', {
      serviceId: 'W12345',
      missingField: 'locationDetail',
    });
    expect(error).toBeInstanceOf(RTTCheckerError);
    expect(error.name).toBe('InvalidTrainDataError');
    expect(error.serviceId).toBe('W12345');
    expect(error.missingField).toBe('locationDetail');
  });

  test('serializes with data details', () => {
    const error = new InvalidTrainDataError('Invalid', {
      serviceId: 'ABC123',
      missingField: 'destination',
    });
    const json = error.toJSON();
    expect(json['serviceId']).toBe('ABC123');
    expect(json['missingField']).toBe('destination');
  });
});
