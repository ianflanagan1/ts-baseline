// @ts-check
// The verify core decides from plain values, so it imports nothing but itself and the banned-syntax list.

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  extends: './dependency-cruiser.js',
  forbidden: [
    {
      name: 'core-is-pure',
      from: { path: '^src/(verify/findProblems|bannedSyntax)\\.ts$' },
      to: { pathNot: '^src/(verify/findProblems|bannedSyntax)\\.ts$' },
    },
  ],
  options: {
    exclude: { path: ['node_modules', '\\.devbox', 'fixtures', 'dist'] },
  },
};
