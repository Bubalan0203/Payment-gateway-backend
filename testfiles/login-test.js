import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  vus: 200,        // Virtual Users
  duration: '10s' // Test duration
};

export default function () {
  let url = 'http://localhost:5001/api/auth/login'; // Replace with your API URL

  let payload = JSON.stringify({
    email: 'megha@gmail.com', // Use a real user from your DB
    password: '111111'
  });

  let params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  let res = http.post(url, payload, params);

  // Basic checks
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has token or success message': (r) => r.body.includes('token') || r.body.includes('success'),
  });

  sleep(1); // Wait 1 second between requests
}
