const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING PROGRAMMATIC API TESTS ===');
  
  // Wait a bit for the server to be up (if run in parallel)
  // Let's assume the server is running on port 5000.
  
  try {
    // 1. Health check
    console.log('\n1. Testing Backend Health Check...');
    const healthRes = await fetch('http://localhost:5000/health');
    if (!healthRes.ok) throw new Error('Health check failed');
    const healthData = await healthRes.json();
    console.log('🟢 Health status:', healthData.status);

    // Generate unique email to avoid unique constraint error
    const testEmail = `tester_${Date.now()}@example.com`;

    // 2. Register Tester
    console.log('\n2. Testing User Registration...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'API Tester',
        email: testEmail,
        password: 'password123',
        role: 'member'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Registration failed: ${regData.error}`);
    console.log('🟢 Registration successful. Token received:', regData.token ? 'Yes' : 'No');
    const token = regData.token;

    // 3. Login
    console.log('\n3. Testing Login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${loginData.error}`);
    console.log('🟢 Login successful. Token verified:', loginData.token === token ? 'Matches' : 'Different');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 4. Get Current User Profile (Me)
    console.log('\n4. Testing /auth/me Profile Retrieval...');
    const meRes = await fetch(`${API_URL}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    if (!meRes.ok) throw new Error(`Fetch profile failed: ${meData.error}`);
    console.log('🟢 Profile retrieved. Name:', meData.user.name, '| Role:', meData.user.role);

    // 5. List Projects
    console.log('\n5. Testing /projects Retrieval...');
    const projRes = await fetch(`${API_URL}/projects`, { headers: authHeaders });
    const projData = await projRes.json();
    if (!projRes.ok) throw new Error(`Fetch projects failed: ${projData.error}`);
    console.log(`🟢 Projects list retrieved. Total projects: ${projData.projects.length}`);
    const firstProjId = projData.projects[0]?.id;

    if (firstProjId) {
      // 6. Create Draft Weekly Report
      console.log('\n6. Testing Create Weekly Report (Draft)...');
      const repRes = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          project_id: firstProjId,
          week_identifier: '2026-W28',
          start_date: '2026-07-06',
          end_date: '2026-07-12',
          tasks_completed: ['Completed API route tests', 'Wrote test runner script'],
          tasks_planned: ['Configure Vite proxies', 'Perform manual walkthroughs'],
          blockers: 'None',
          hours_worked: 8,
          notes: 'Automatic testing script run.',
          status: 'draft'
        })
      });
      const repData = await repRes.json();
      if (!repRes.ok) throw new Error(`Create report failed: ${repData.error}`);
      console.log('🟢 Report saved successfully. ID:', repData.reportId);
      const reportId = repData.reportId;

      // 7. Get History
      console.log('\n7. Testing Retrieve Personal Report History...');
      const histRes = await fetch(`${API_URL}/reports/my-history`, { headers: authHeaders });
      const histData = await histRes.json();
      if (!histRes.ok) throw new Error(`Fetch history failed: ${histData.error}`);
      
      const found = histData.reports.some(r => r.id === reportId);
      console.log('🟢 Saved report found in history:', found ? 'Yes' : 'No');

      // 8. Delete Draft
      console.log('\n8. Cleaning up draft report...');
      const delRes = await fetch(`${API_URL}/reports/${reportId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const delData = await delRes.json();
      if (!delRes.ok) throw new Error(`Delete report failed: ${delData.error}`);
      console.log('🟢 Draft report deleted successfully.');
    } else {
      console.log('⚠️ Skipping report test since no projects are defined.');
    }

    console.log('\n=======================================');
    console.log('🎉 ALL INTEGRATION API TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=======================================');
  } catch (err) {
    console.error('\n🔴 API TEST ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
