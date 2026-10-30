// @ts-check
// The dependency rules every project shares. A project's .dependency-cruiser.js extends this file and adds its own
// rules; one with the same name changes only the fields it sets, so a project whose core lives elsewhere re-points
// `core-is-pure` and keeps its severity. dependency-cruiser loads `extends` by path, not through package exports,
// which is why this file sits at the package root.

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'core-is-pure',
      comment: 'The core does no I/O: no Node built-ins, no libraries, nothing else of ours.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { pathNot: '^src/core/' },
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
    exclude: { path: ['node_modules', '\\.devbox'] },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'default'], extensions: ['.ts', '.js'] },
  },
};
