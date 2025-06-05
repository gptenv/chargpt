#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:8842';
const TEST_FIXTURES_DIR = './dev/test/fixtures';

async function runTest(name, testData) {
  console.log(`\n🧪 Running test: ${name}`);
  console.log(`📄 ${testData.description}`);

  try {
    const { request, expected_response } = testData;
    
    const url = `${API_BASE}${request.url}`;
    const options = {
      method: request.method,
      headers: request.headers || {},
    };

    if (request.body) {
      options.body = JSON.stringify(request.body);
    }

    console.log(`📤 ${request.method} ${url}`);
    
    const response = await fetch(url, options);
    let data;
    const isStream = request?.body?.stream === true || request?.url?.includes('/stream');
    if (isStream) {
      const text = await response.text();
      const lines = text.split('\n').filter(l => l.trim().startsWith('data: '));
      const jsonLines = lines.map(l => l.replace(/^data: /, '').trim()).filter(l => l !== '[DONE]');
      data = jsonLines.map(l => { try { return JSON.parse(l); } catch { return { error: 'Invalid JSON in stream' }; } });
    } else {
      data = await response.json();
    }

    console.log(`📥 Status: ${response.status}`);
    console.log(`📋 Response:`, JSON.stringify(data, null, 2));

    // Basic validation
    if (response.ok) {
      console.log(`✅ Request successful`);
      
      // Check basic structure
      if (expected_response.object && data.object === expected_response.object) {
        console.log(`✅ Response object type matches: ${data.object}`);
      }
      
      if (expected_response.choices && data.choices) {
        console.log(`✅ Response has choices array`);
      }

      if (expected_response.conversation_id && data.conversation_id) {
        console.log(`✅ conversation_id present: ${data.conversation_id}`);
      }
      
      if (expected_response.data && data.data) {
        console.log(`✅ Response has data array with ${data.data.length} items`);
      }
    } else {
      console.log(`❌ Request failed with status ${response.status}`);
      console.log(`🔍 This might be expected if ChatGPT backend is unavailable`);
    }

  } catch (error) {
    console.log(`❌ Test failed:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting CharGPT Backend Test Suite');
  console.log(`🎯 Testing API at: ${API_BASE}`);

  // Health check first
  try {
    console.log('\n🏥 Health check...');
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    console.log(`✅ Server is healthy:`, healthData);
  } catch (error) {
    console.log(`❌ Server health check failed:`, error.message);
    console.log(`💡 Make sure the server is running with: npm start`);
    process.exit(1);
  }

  // Load and run test fixtures
  const testFiles = fs.readdirSync(TEST_FIXTURES_DIR).filter(f => f.endsWith('.json'));
  
  for (const testFile of testFiles) {
    const testPath = path.join(TEST_FIXTURES_DIR, testFile);
    const testData = JSON.parse(fs.readFileSync(testPath, 'utf8'));
    const testName = path.basename(testFile, '.json');
    
    await runTest(testName, testData);
  }

  console.log('\n🏁 Test suite completed!');
  console.log('\n💡 Tips:');
  console.log('   - Set CHARGPT_DEBUG=true for verbose logging');
  console.log('   - Configure .env with real ChatGPT credentials for full testing');
  console.log('   - Add more test fixtures in dev/test/fixtures/');
}

main().catch(console.error);
