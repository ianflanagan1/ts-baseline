export default {
  extends: '../../../dependency-cruiser.js',
  forbidden: [{ name: 'no-circular', severity: 'warn' }],
};
