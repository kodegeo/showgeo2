/**
 * Authentication Test Script
 * 
 * Tests the full authentication flow:
 * 1. Register a new user with Supabase
 * 2. Create app_users record via backend
 * 3. Login with the user
 * 4. Get current user (app_users lookup)
 * 5. Logout
 * 
 * Usage: node scripts/test-auth.js
 */

const path = require('path');

// Add frontend node_modules to module path
const frontendNodeModules = path.join(__dirname, '../frontend/node_modules');
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  try {
    return originalRequire.apply(this, arguments);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      try {
        return originalRequire.apply(this, [path.join(frontendNodeModules, id)]);
      } catch (e2) {
        throw e;
      }
    }
    throw e;
  }
};

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Load environment variables from frontend/.env
const fs = require('fs');
const envPath = path.join(__dirname, '../frontend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

// Sample test user - using a valid email format
// Note: Supabase may require email confirmation depending on your project settings
const TEST_USER = {
  email: `testuser${Date.now()}@testmail.com`,
  password: 'TestPassword123!@#',
  firstName: 'Test',
  lastName: 'User',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Initialize Supabase client
if (!SUPABASE_URL || !SUPABASE_KEY) {
  logError('Missing Supabase configuration!');
  logWarning('Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in frontend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

// API client helper using native fetch
async function apiRequest(method, endpoint, data = null) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseData = await response.json();

  if (!response.ok) {
    const error = new Error(responseData.message || `HTTP ${response.status}`);
    error.response = { status: response.status, data: responseData };
    throw error;
  }

  return { status: response.status, data: responseData };
}

/**
 * Test 1: Register a new user
 */
async function testRegister() {
  logStep('1', 'Testing user registration...');
  
  try {
    // 1. Register with Supabase Auth
    log('  → Registering with Supabase Auth...', 'blue');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (authError) {
      throw new Error(`Supabase registration failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Registration failed - no user returned');
    }

    logSuccess(`Supabase user created: ${authData.user.id}`);
    log(`    Email: ${TEST_USER.email}`, 'blue');
    
    // Check if email confirmation is required
    if (authData.user.email_confirmed_at === null) {
      logWarning('Email confirmation required - user may need to confirm email before login');
      logWarning('  To disable email confirmation for testing:');
      logWarning('    1. Go to Supabase Dashboard > Authentication > Settings');
      logWarning('    2. Disable "Enable email confirmations"');
      logWarning('  OR use the Supabase Admin API to confirm the email programmatically');
    } else {
      logSuccess('Email already confirmed');
    }

    // 2. Create app_users record via backend
    log('  → Creating app_users record via backend...', 'blue');
    const response = await apiRequest('POST', '/auth/register-app-user', {
      authUserId: authData.user.id,
      email: TEST_USER.email,
      firstName: TEST_USER.firstName,
      lastName: TEST_USER.lastName,
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Backend registration failed: ${response.status}`);
    }

    logSuccess(`app_users record created: ${response.data.id}`);
    log(`    Email: ${response.data.email}`, 'blue');
    log(`    Role: ${response.data.role}`, 'blue');

    return {
      supabaseUser: authData.user,
      appUser: response.data,
      session: authData.session,
    };
  } catch (error) {
    logError(`Registration failed: ${error.message}`);
    if (error.response) {
      logError(`  Backend error: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

/**
 * Test 2: Logout (to test fresh login)
 */
async function testLogout() {
  logStep('2', 'Testing logout...');
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
    logSuccess('Logged out successfully');
  } catch (error) {
    logError(`Logout failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 3: Login with existing user
 */
async function testLogin() {
  logStep('3', 'Testing user login...');
  
  try {
    // 1. Login with Supabase
    log('  → Logging in with Supabase Auth...', 'blue');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (authError) {
      if (authError.message.includes('Email not confirmed')) {
        logWarning('Email confirmation required - skipping login test');
        logWarning('  Please confirm the email in Supabase Dashboard or disable email confirmation');
        throw new Error('Email not confirmed - cannot test login');
      }
      throw new Error(`Supabase login failed: ${authError.message}`);
    }

    if (!authData.user || !authData.session) {
      throw new Error('Login failed - no user or session returned');
    }

    logSuccess(`Logged in: ${authData.user.id}`);
    log(`    Email: ${authData.user.email}`, 'blue');

    // 2. Get app_users record from backend
    log('  → Fetching app_users record from backend...', 'blue');
    const response = await apiRequest('GET', `/users/by-auth-user/${authData.user.id}`);

    if (response.status !== 200) {
      throw new Error(`Backend lookup failed: ${response.status}`);
    }

    logSuccess(`app_users record found: ${response.data.id}`);
    log(`    Email: ${response.data.email}`, 'blue');
    log(`    Role: ${response.data.role}`, 'blue');
    log(`    authUserId: ${response.data.authUserId}`, 'blue');

    // Verify authUserId matches
    if (response.data.authUserId !== authData.user.id) {
      throw new Error(`authUserId mismatch! Expected ${authData.user.id}, got ${response.data.authUserId}`);
    }

    logSuccess('authUserId matches Supabase user ID');

    return {
      supabaseUser: authData.user,
      appUser: response.data,
      session: authData.session,
    };
  } catch (error) {
    logError(`Login failed: ${error.message}`);
    if (error.response) {
      logError(`  Backend error: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

/**
 * Test 4: Get current user (session check)
 */
async function testGetCurrentUser() {
  logStep('4', 'Testing get current user...');
  
  try {
    // 1. Check Supabase session
    log('  → Checking Supabase session...', 'blue');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Session check failed: ${sessionError.message}`);
    }

    if (!session) {
      throw new Error('No active session found');
    }

    logSuccess(`Active session found: ${session.user.id}`);

    // 2. Get app_users record
    log('  → Fetching app_users record...', 'blue');
    const response = await apiRequest('GET', `/users/by-auth-user/${session.user.id}`);

    if (response.status !== 200) {
      throw new Error(`Backend lookup failed: ${response.status}`);
    }

    logSuccess(`Current user: ${response.data.email}`);
    log(`    ID: ${response.data.id}`, 'blue');
    log(`    Role: ${response.data.role}`, 'blue');

    return response.data;
  } catch (error) {
    logError(`Get current user failed: ${error.message}`);
    if (error.response) {
      logError(`  Backend error: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

/**
 * Test 5: Final logout
 */
async function testFinalLogout() {
  logStep('5', 'Testing final logout...');
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
    logSuccess('Logged out successfully');

    // Verify session is cleared
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      throw new Error('Session still exists after logout');
    }
    logSuccess('Session cleared');
  } catch (error) {
    logError(`Logout failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  Authentication Test Suite', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  log(`Test User: ${TEST_USER.email}`, 'yellow');
  log(`API URL: ${API_URL}`, 'yellow');
  log(`Supabase URL: ${SUPABASE_URL}`, 'yellow');

  let testResults = {
    passed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Test 1: Register
    try {
      await testRegister();
      testResults.passed++;
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ test: 'Register', error: error.message });
      // Continue with other tests even if registration fails (user might already exist)
      logWarning('Registration failed, but continuing with other tests...');
    }

    // Test 2: Logout
    try {
      await testLogout();
      testResults.passed++;
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ test: 'Logout', error: error.message });
    }

    // Test 3: Login
    try {
      await testLogin();
      testResults.passed++;
    } catch (error) {
      if (error.message.includes('Email not confirmed')) {
        logWarning('Skipping login test due to email confirmation requirement');
        // Don't count this as a failure if it's just email confirmation
        testResults.errors.push({ test: 'Login', error: error.message + ' (expected if email confirmation is enabled)' });
      } else {
        testResults.failed++;
        testResults.errors.push({ test: 'Login', error: error.message });
      }
    }

    // Test 4: Get current user
    try {
      await testGetCurrentUser();
      testResults.passed++;
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ test: 'Get Current User', error: error.message });
    }

    // Test 5: Final logout
    try {
      await testFinalLogout();
      testResults.passed++;
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ test: 'Final Logout', error: error.message });
    }

  } catch (error) {
    logError(`\nUnexpected error: ${error.message}`);
    testResults.failed++;
  }

  // Print summary
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  Test Summary', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  log(`Total Tests: ${testResults.passed + testResults.failed}`, 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');

  if (testResults.errors.length > 0) {
    log('\nErrors:', 'red');
    testResults.errors.forEach(({ test, error }) => {
      logError(`  ${test}: ${error}`);
    });
  }

  if (testResults.failed === 0) {
    log('\n✓ All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some tests failed', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

