// Common test utilities to keep tests concise and consistent

// Advance all timers and ensure any pending promises flush afterwards
export async function advanceTimersAndFlush() {
  const runTimersPromise = jest.runAllTimersAsync();
  await Promise.resolve();
  await runTimersPromise;
}

// Fetch builders
export function makeOkFetch(json) {
  return jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(json) }));
}

export function makeErrorFetch(status = 500, body = 'Error') {
  return jest.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      statusText: 'Error',
      text: () => Promise.resolve(body),
    })
  );
}

export function makeNetworkErrorFetch(err = new Error('Network error')) {
  return jest.fn(() => Promise.reject(err));
}

// Service factory
export function makeService({ lateness, cancelled = false, booked, realtime } = {}) {
  const locationDetail = {};
  if (cancelled) {
    locationDetail.cancelReasonCode = 'CANCEL';
    locationDetail.displayAs = 'CANCELLED_CALL';
  }
  if (typeof lateness === 'number') {
    locationDetail.realtimeGbttDepartureLateness = lateness;
  }
  if (booked) locationDetail.gbttBookedDeparture = booked;
  if (realtime) locationDetail.realtimeDeparture = realtime;
  return { locationDetail };
}
