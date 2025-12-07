/**
 * Shared test helpers for Matter behavior testing
 * Provides common patterns for mocking and testing behavior state management
 */

/**
 * Create a mock behavior with state management
 * @param {Object} initialState - Initial state object
 * @param {Object} methods - Methods to add to the mock behavior
 * @returns {Object} Mock behavior with state and methods
 */
export function createMockBehavior(initialState = {}, methods = {}) {
  return {
    state: { ...initialState },
    ...methods,
  };
}

/**
 * Test that a behavior initializes with expected state
 * @param {Object} behavior - Behavior instance to test
 * @param {Object} expectedState - Expected initial state
 */
export function expectInitialState(behavior, expectedState) {
  Object.entries(expectedState).forEach(([key, value]) => {
    expect(behavior.state[key]).toEqual(value);
  });
}

/**
 * Test that a method updates state correctly
 * @param {Object} behavior - Behavior instance
 * @param {string} methodName - Method name to call
 * @param {Array} args - Arguments to pass to method
 * @param {string} stateKey - State key to check
 * @param {*} expectedValue - Expected value after method call
 */
export async function expectStateUpdate(behavior, methodName, args, stateKey, expectedValue) {
  await behavior[methodName](...args);
  expect(behavior.state[stateKey]).toBe(expectedValue);
}

/**
 * Test a series of state transitions
 * @param {Object} behavior - Behavior instance
 * @param {string} methodName - Method name to call for transitions
 * @param {Array<{input: *, expected: *}>} transitions - Array of input/expected pairs
 * @param {string} stateKey - State key to check
 */
export async function expectTransitions(behavior, methodName, transitions, stateKey) {
  for (const { input, expected } of transitions) {
    await behavior[methodName](input);
    expect(behavior.state[stateKey]).toBe(expected);
  }
}
