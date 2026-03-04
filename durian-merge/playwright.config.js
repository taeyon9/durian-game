const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: ['e2e.test.js', 'perf-benchmark.js'],
  timeout: 30000,
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
    baseURL: 'http://localhost:4983',
  },
  webServer: {
    command: 'npx serve . -l 4983',
    port: 4983,
    reuseExistingServer: false,
    timeout: 10000,
  },
});
