#!/usr/bin/env node

/**
 * Youcaps Backend - API Test Suite
 * Run: node tests/integration.test.js
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test cases
const tests = [];

async function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  log('\n🧪 Youcaps Backend - Integration Tests\n', 'blue');
  log(`Testing: ${BASE_URL}\n`, 'blue');

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      log(`✓ ${name}`, 'green');
      passed++;
    } catch (error) {
      log(`✗ ${name}`, 'red');
      log(`  Error: ${error.message}`, 'red');
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  log(`\nResults: ${passed} passed, ${failed} failed\n`, failed === 0 ? 'green' : 'red');
  process.exit(failed === 0 ? 0 : 1);
}

// Define tests
test('Health check endpoint', async () => {
  const res = await request('GET', '/health');
  if (res.status !== 200 || !res.data.success) throw new Error('Health check failed');
});

test('Health ready endpoint', async () => {
  const res = await request('GET', '/health/ready');
  if (res.status !== 200 || !res.data.success) throw new Error('Readiness check failed');
});

test('Health live endpoint', async () => {
  const res = await request('GET', '/health/live');
  if (res.status !== 200 || !res.data.success) throw new Error('Liveness check failed');
});

test('Subscribe endpoint - valid request', async () => {
  const body = {
    email: `test-${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    age: 30,
    healthGoals: ['energy'],
    currentSupplements: [],
    medicalConditions: []
  };

  const res = await request('POST', '/api/subscribe', body);
  if (res.status !== 201 || !res.data.success) {
    throw new Error(`Expected 201, got ${res.status}: ${res.data.error}`);
  }
  
  // Store for later tests
  global.testCustomerId = res.data.data.customerId;
  global.testSubscriptionId = res.data.data.subscriptionId;
});

test('Subscribe endpoint - invalid email', async () => {
  const body = {
    email: 'not-an-email',
    firstName: 'Test',
    lastName: 'User'
  };

  const res = await request('POST', '/api/subscribe', body);
  if (res.status !== 400 && res.status !== 422) {
    throw new Error(`Expected validation error, got ${res.status}`);
  }
});

test('Subscribe endpoint - missing required fields', async () => {
  const body = {
    email: 'test@example.com'
  };

  const res = await request('POST', '/api/subscribe', body);
  if (res.status !== 422 && res.status !== 400) {
    throw new Error(`Expected validation error, got ${res.status}`);
  }
});

test('Assessment endpoint - valid submission', async () => {
  if (!global.testCustomerId) {
    throw new Error('Customer ID not set from subscribe test');
  }

  const body = {
    customerId: global.testCustomerId,
    answers: [
      { questionId: 'energy', value: 3 },
      { questionId: 'stress', value: 8 },
      { questionId: 'sleep', value: 4 }
    ]
  };

  const res = await request('POST', '/api/assessment', body);
  if (res.status !== 201 || !res.data.success) {
    throw new Error(`Expected 201, got ${res.status}: ${res.data.error}`);
  }

  if (!res.data.data.score || !res.data.data.recommendations) {
    throw new Error('Missing score or recommendations in response');
  }

  global.testAssessmentId = res.data.data.assessmentId;
});

test('Assessment history endpoint', async () => {
  if (!global.testCustomerId) {
    throw new Error('Customer ID not set from subscribe test');
  }

  const res = await request('GET', `/api/assessment/${global.testCustomerId}`);
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Expected 200, got ${res.status}`);
  }

  if (!Array.isArray(res.data.data.assessments)) {
    throw new Error('Assessments should be an array');
  }
});

test('Latest assessment endpoint', async () => {
  if (!global.testCustomerId) {
    throw new Error('Customer ID not set from subscribe test');
  }

  const res = await request('GET', `/api/assessment/${global.testCustomerId}/latest`);
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Expected 200, got ${res.status}`);
  }

  if (!res.data.data.score) {
    throw new Error('Assessment should have a score');
  }
});

test('Payment creation endpoint', async () => {
  if (!global.testCustomerId || !global.testSubscriptionId) {
    throw new Error('Customer or Subscription ID not set');
  }

  const body = {
    customerId: global.testCustomerId,
    subscriptionId: global.testSubscriptionId,
    redirectUrl: 'https://youcaps.app/payment-success'
  };

  const res = await request('POST', '/api/payment/create', body);
  if (res.status !== 201 || !res.data.success) {
    throw new Error(`Expected 201, got ${res.status}: ${res.data.error}`);
  }

  if (!res.data.data.checkoutUrl) {
    throw new Error('Missing checkout URL in payment response');
  }

  global.testPaymentId = res.data.data.paymentId;
});

test('Get subscription details', async () => {
  if (!global.testCustomerId) {
    throw new Error('Customer ID not set');
  }

  const res = await request('GET', `/api/subscribe/${global.testCustomerId}`);
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Expected 200, got ${res.status}`);
  }

  if (!res.data.data.customer || !res.data.data.subscriptions) {
    throw new Error('Missing customer or subscriptions data');
  }
});

test('Non-existent customer returns 404', async () => {
  const res = await request('GET', '/api/subscribe/00000000-0000-0000-0000-000000000000');
  if (res.status !== 404) {
    throw new Error(`Expected 404, got ${res.status}`);
  }
});

test('Invalid endpoint returns 404', async () => {
  const res = await request('GET', '/api/invalid-endpoint');
  if (res.status !== 404) {
    throw new Error(`Expected 404, got ${res.status}`);
  }
});

// Run all tests
runTests().catch(error => {
  log(`\n❌ Test runner error: ${error.message}`, 'red');
  process.exit(1);
});
