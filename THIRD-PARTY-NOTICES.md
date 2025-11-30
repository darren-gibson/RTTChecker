# Third-Party Notices

This project depends on open-source packages. Their licenses are reproduced or referenced below. For the most current and authoritative license list, generate via the commands in the Automation section.

| Package | Version (range) | License (indicative) | Source |
|---------|-----------------|----------------------|--------|
| @project-chip/matter.js | ^0.12.6 | Apache-2.0 | https://github.com/project-chip/matter.js |
| @project-chip/matter-node.js | ^0.12.6 | Apache-2.0 | https://github.com/project-chip/matter.js |
| qrcode-terminal | ^0.12.0 | MIT | https://github.com/gtanner/qrcode-terminal |
| zod | ^4.1.13 | MIT | https://github.com/colinhacks/zod |
| jest | ^30.2.0 | MIT | https://github.com/jestjs/jest |
| babel-jest | ^30.2.0 | MIT | https://github.com/facebook/jest |
| @babel/preset-env | 7.28.5 | MIT | https://github.com/babel/babel |
| eslint | ^9.0.0 | MIT | https://github.com/eslint/eslint |
| eslint-plugin-import | ^2.29.1 | MIT | https://github.com/import-js/eslint-plugin-import |
| globals | ^16.5.0 | MIT | https://github.com/sindresorhus/globals |
| prettier | ^3.2.5 | MIT | https://github.com/prettier/prettier |

Dev dependencies are listed for transparency; only production dependencies (@project-chip/*, qrcode-terminal, zod) are shipped at runtime.

## How to Regenerate This List

Install a license scanner locally (not pinned as a prod dependency):

```bash
npm install --save-dev license-checker
npx license-checker --production --json > third-party-licenses.json
npx license-checker --production --summary > third-party-licenses.txt
```

Optionally produce Markdown directly:
```bash
npx license-checker --production --markdown > third-party-licenses.md
```

Review generated output before publishing. For any Apache-2.0 or BSD licenses requiring NOTICE content, include the original NOTICE language if present.

## Attribution & Disclaimer

License information above is indicative and should be validated against the actual installed versions (lockfile). If a dependency is updated, regenerate this file. The presence of a package here does not modify its original license terms.

## Updating

1. Update dependencies (`npm update` or version bump).
2. Regenerate license artifacts.
3. Replace table entries with new versions as needed.
4. Commit changes alongside dependency bump.

---
Generated on: 2025-11-30