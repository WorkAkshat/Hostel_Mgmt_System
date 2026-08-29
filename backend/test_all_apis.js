const http = require('http');

function makeRequest(path, method = 'GET', postData = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9000,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(postData));
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('        HARI PUSHP HMS - API FUNCTIONAL TEST        ');
  console.log('====================================================\n');

  try {
    // 1. Login Admin
    console.log('[1/7] Testing Admin Login (/auth/login)...');
    const adminLogin = await makeRequest('/auth/login', 'POST', {
      email: 'admin@haripushppg.com',
      password: 'password123'
    });
    console.log(`      Status: ${adminLogin.status}`);
    console.log(`      User: ${adminLogin.data.user?.name || 'N/A'} (Role: ${adminLogin.data.user?.role || 'N/A'})`);
    const adminToken = adminLogin.data.token;

    // 2. Login Student
    console.log('\n[2/7] Testing Student Login (/auth/login)...');
    const studentLogin = await makeRequest('/auth/login', 'POST', {
      email: 'pooja@haripushppg.com',
      password: 'password123'
    });
    console.log(`      Status: ${studentLogin.status}`);
    console.log(`      User: ${studentLogin.data.user?.name || 'N/A'} (Role: ${studentLogin.data.user?.role || 'N/A'})`);
    const studentToken = studentLogin.data.token;

    // 3. Fetch Dashboard Stats
    console.log('\n[3/7] Testing Admin Dashboard Endpoint (/dashboard)...');
    const dash = await makeRequest('/dashboard', 'GET', null, adminToken);
    console.log(`      Status: ${dash.status}`);
    console.log(`      Summary Stats: ${JSON.stringify(dash.data.stats || dash.data)}`);

    // 4. Fetch Demand Notes
    console.log('\n[4/7] Testing Demand Notes Endpoint (/demand-notes)...');
    const demandNotes = await makeRequest('/demand-notes', 'GET', null, adminToken);
    console.log(`      Status: ${demandNotes.status}`);
    console.log(`      Total Demand Notes Found: ${Array.isArray(demandNotes.data) ? demandNotes.data.length : 0}`);

    // 5. Fetch Mess Cook Dashboard
    console.log('\n[5/7] Testing Mess Cook Dashboard Endpoint (/mess/cook-dashboard)...');
    const cook = await makeRequest('/mess/cook-dashboard', 'GET', null, adminToken);
    console.log(`      Status: ${cook.status}`);
    console.log(`      Total Active Residents: ${cook.data.totalStudents || 0}`);

    // 6. Fetch Suggestions
    console.log('\n[6/7] Testing Suggestion Box Endpoint (/suggestions)...');
    const suggestions = await makeRequest('/suggestions', 'GET', null, adminToken);
    console.log(`      Status: ${suggestions.status}`);
    console.log(`      Total Suggestions Found: ${Array.isArray(suggestions.data) ? suggestions.data.length : 0}`);

    // 7. Fetch Company Config
    console.log('\n[7/7] Testing Company Config Endpoint (/demand-notes/company-config)...');
    const companyCfg = await makeRequest('/demand-notes/company-config', 'GET', null, adminToken);
    console.log(`      Status: ${companyCfg.status}`);
    console.log(`      Config Loaded: ${Object.keys(companyCfg.data.companies || {}).length} Floor Companies`);

    console.log('\n====================================================');
    console.log('           ALL API FUNCTIONAL TESTS COMPLETED        ');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

runTestSuite();
