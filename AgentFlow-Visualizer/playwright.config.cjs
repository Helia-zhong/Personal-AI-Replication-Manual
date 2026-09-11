const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  workers: 1,
  use: { baseURL: process.env.AGENTFLOW_TEST_URL || 'http://127.0.0.1:8092', headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) },
  reporter: 'list',
  ...(!process.env.AGENTFLOW_TEST_URL ? { webServer: {
    command: '"' + (process.env.AGENTFLOW_TEST_PYTHON || 'python') + '" -m uvicorn backend.app:app --host 127.0.0.1 --port 8092',
    url: 'http://127.0.0.1:8092/api/health',
    env: { AGENTFLOW_DB: '.agentflow/ui-tests.sqlite3' },
    reuseExistingServer: false,
  } } : {}),
});
