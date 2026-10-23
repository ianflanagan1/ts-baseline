// @ts-check
// The verify core decides from plain values, so it imports nothing but itself and the banned-syntax list.

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'core-is-pure',
      severity: 'error',
      from: { path: '^src/(verify/findProblems|bannedSyntax)\\.ts$' },
      to: { pathNot: '^src/(verify/findProblems|bannedSyntax)\\.ts$' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['node_modules', '\\.devbox', 'fixtures', 'dist'] },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'default'], extensions: ['.ts', '.js'] },
  },
};
