# TypeScript Migration Guide

## ✅ Completed

### Phase 1: Setup and Initial Conversion (DONE)
- ✅ Created `feature/typescript-migration` branch
- ✅ Installed TypeScript dependencies:
  - `typescript`, `@types/node`, `@types/jest`, `@types/pino`
  - `ts-jest`, `ts-node`
- ✅ Created `tsconfig.json` with strict type checking
- ✅ Updated `jest.config.cjs` for TypeScript support
- ✅ Renamed all source files from `.js` to `.ts`
- ✅ Converted `src/constants.ts` with proper TypeScript types
- ✅ Converted `src/utils/validation.ts` with type guards

### Files Renamed (34 files)
All files in `src/` and `index.ts` have been renamed to `.ts`

## 🚧 In Progress

### Phase 2: Fix TypeScript Compilation Errors (~50 errors)

**Error Categories:**
1. **Process.env type errors** (~20 errors in `src/config.ts`)
   - Need to properly type `process.env` access
   - Consider creating environment variable types

2. **Error handling** (~10 errors)
   - `catch (error)` blocks treat error as `unknown`
   - Need explicit type narrowing

3. **API Client** (~8 errors)
   - Function parameters need explicit types
   - Options objects need interfaces

4. **Class properties** (~5 errors)
   - Missing property declarations in error classes
   - Need proper class typing

5. **Override modifiers** (~2 errors)
   - Methods overriding base class need `override` keyword

## 📋 TODO

### Phase 3: Create Type Definitions

Create `src/types/` directory with:

1. **`src/types/config.ts`**
   ```typescript
   export interface RTTConfig {
     user?: string;
     pass?: string;
   }
   
   export interface TrainConfig {
     originTiploc: string;
     destTiploc: string;
     minAfterMinutes: number;
     windowMinutes: number;
   }
   
   // ... etc
   ```

2. **`src/types/api.ts`**
   ```typescript
   export interface RTTApiOptions {
     user: string;
     pass: string;
     fetchImpl?: typeof fetch;
     maxRetries?: number;
   }
   
   // ... etc
   ```

3. **`src/types/matter.ts`**
   - Matter.js related types
   - Device configuration types

### Phase 4: Fix Remaining Files

Priority order (easiest to hardest):
1. ✅ `src/utils/validation.ts` (DONE)
2. ✅ `src/constants.ts` (DONE)
3. `src/utils/timeUtils.ts`
4. `src/errors.ts` - Add proper error class properties
5. `src/domain/errors.ts`
6. `src/api/errors.ts` - Fix error class properties
7. `src/config.ts` - Fix process.env access
8. `src/domain/modeMapping.ts`
9. `src/domain/airQualityMapping.ts`
10. `src/domain/trainStatus.ts`
11. `src/api/rttApiClient.ts` - Add interfaces for options
12. `src/utils/logger.ts`
13. `src/utils/retryableRequest.ts`
14. `src/utils/circuitBreaker.ts`
15. `src/utils/resilientRequest.ts`
16. `src/services/trainSelectionService.ts`
17. `src/services/trainStatusService.ts`
18. `src/devices/TrainStatusDevice.ts`
19. `src/runtime/` files
20. `index.ts`

### Phase 5: Migrate Test Files

1. Rename test files to `.test.ts`
2. Add type annotations to test code
3. Fix any test-specific type issues
4. Ensure all tests pass

### Phase 6: Update Build Configuration

1. Update `package.json` scripts:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "build:watch": "tsc --watch",
       "start": "node dist/index.js",
       "dev": "ts-node --esm index.ts",
       "test": "jest",
       "lint": "eslint . --ext .ts",
       "typecheck": "tsc --noEmit"
     }
   }
   ```

2. Update Docker files to build TypeScript
3. Update CI/CD workflows

### Phase 7: Final Verification

1. Run `npm run typecheck` - should have 0 errors
2. Run `npm test` - all tests passing
3. Run `npm run build` - successful compilation
4. Test runtime behavior
5. Update documentation

## 🎯 Current Status

**Branch:** `feature/typescript-migration`
**Compilation:** ~50 TypeScript errors remaining
**Tests:** Not yet migrated
**Next Step:** Fix TypeScript compilation errors starting with error classes and config

## 🛠 Quick Commands

```bash
# Check TypeScript errors
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/config.ts

# Build project
npm run build

# Run tests (will fail until migration complete)
npm test

# Type check only
npm run typecheck
```

## 📝 Notes

- Using strict mode for maximum type safety
- Target: ES2022 with Node.js native ESM
- Output directory: `./dist`
- Source maps enabled for debugging
- Declaration files (.d.ts) generated for library use

## 🔄 Iterative Approach

Work on 3-5 files at a time:
1. Fix compilation errors for those files
2. Commit changes
3. Move to next batch
4. Review and test regularly

This keeps changes manageable and easier to review/debug.
