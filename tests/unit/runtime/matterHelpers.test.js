import { setEndpointName } from '../../../src/runtime/helpers/matterHelpers.js';

// Stub BD-BI server behavior shape with env and state
// removed unused Env stub

function makeEndpointMock() {
  const calls = { userLabel: null, fixedLabel: null };
  return {
    act: async (fn) => {
      await fn({
        userLabel: { setLabelList: async (list) => (calls.userLabel = list) },
        fixedLabel: { setLabelList: async (list) => (calls.fixedLabel = list) },
      });
    },
    calls,
  };
}

describe('matterHelpers', () => {
  test('setEndpointName sets both UserLabel and FixedLabel', async () => {
    const ep = makeEndpointMock();
    await setEndpointName(ep, 'Nice Name');
    expect(ep.calls.userLabel).toEqual([{ label: 'Name', value: 'Nice Name' }]);
    expect(ep.calls.fixedLabel).toEqual([{ label: 'Name', value: 'Nice Name' }]);
  });
});
