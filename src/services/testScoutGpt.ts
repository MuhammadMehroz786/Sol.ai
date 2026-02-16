import { WEBHOOK_SCOUT_GPT_TEST } from "@/constants/webhooks";

// Simple test to directly call Scout GPT API
// Use proxy endpoint for development to avoid CORS issues
const SCOUT_GPT_ENDPOINT = process.env.NODE_ENV === 'development'
  ? '/api/scout-gpt'
  : WEBHOOK_SCOUT_GPT_TEST;

export const testScoutGptApi = async () => {
  console.log('🧪 Testing Scout GPT API directly...');
  console.log('📡 Endpoint:', SCOUT_GPT_ENDPOINT);

  try {
    // Test POST request
    console.log('📤 Trying POST request...');
    const postResponse = await fetch(SCOUT_GPT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_signals',
        timestamp: new Date().toISOString(),
        test: true
      })
    });

    console.log('📊 POST Response status:', postResponse.status);
    console.log('📊 POST Response statusText:', postResponse.statusText);
    console.log('📊 POST Response headers:', Object.fromEntries(postResponse.headers.entries()));

    if (postResponse.ok) {
      const postData = await postResponse.json();
      console.log('✅ POST Response data:', postData);
      console.log('📝 POST Data type:', typeof postData);
      console.log('📝 POST Is array:', Array.isArray(postData));
      return { method: 'POST', success: true, data: postData };
    } else {
      const postError = await postResponse.text();
      console.log('❌ POST Error response:', postError);
    }

    // Test GET request
    console.log('📤 Trying GET request...');
    const getResponse = await fetch(SCOUT_GPT_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('📊 GET Response status:', getResponse.status);
    console.log('📊 GET Response statusText:', getResponse.statusText);
    console.log('📊 GET Response headers:', Object.fromEntries(getResponse.headers.entries()));

    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('✅ GET Response data:', getData);
      console.log('📝 GET Data type:', typeof getData);
      console.log('📝 GET Is array:', Array.isArray(getData));
      return { method: 'GET', success: true, data: getData };
    } else {
      const getError = await getResponse.text();
      console.log('❌ GET Error response:', getError);
    }

    // If both fail
    console.log('❌ Both POST and GET requests failed');
    return { method: 'NONE', success: false, error: 'Both requests failed' };

  } catch (error) {
    console.error('❌ Network error testing Scout GPT API:', error);
    return { method: 'ERROR', success: false, error: error.message };
  }
};

// Removed auto-run: call testScoutGptApi() explicitly where needed