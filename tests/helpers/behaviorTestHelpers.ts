/**
 * Shared test helpers for Matter behavior testing
 * Provides common patterns for mocking and testing behavior state management
 */

interface MockBehavior {
  state: Record<string, any>;
  [key: string]: any;
}

/**
 * Create a mock behavior with state management
 */
export function createMockBehavior(
  initialState: Record<string, any> = {},
  methods: Record<string, any> = {}
): MockBehavior {
  return {
    state: { ...initialState },
    ...methods,
  };
}

/**
 * Test that a behavior initializes with expected state
 */
export function expectInitialState(
  behavior: MockBehavior,
  expectedState: Record<string, any>
): void {
  Object.entries(expectedState).forEach(([key, value]) => {
    expect(behavior.state[key]).toEqual(value);
  });
}

/**
 * Test that a method updates state correctly
 */
export async function expectStateUpdate(
  behavior: MockBehavior,
  methodName: string,
  args: any[],
  stateKey: string,
  expectedValue: any
): Promise<void> {
  await behavior[methodName](...args);
  expect(behavior.state[stateKey]).toBe(expectedValue);
}

/**
 * Test a series of state transitions
 */
export async function expectTransitions(
  behavior: MockBehavior,
  methodName: string,
  transitions: Array<{ input: any; expected: any }>,
  stateKey: string
): Promise<void> {
  for (const { input, expected } of transitions) {
    await behavior[methodName](input);
    expect(behavior.state[stateKey]).toBe(expected);
  }
}
