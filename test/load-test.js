import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
	stages: [
		{ duration: '10s', target: 5 }, // Ramp-up to 5 VUs
		{ duration: '40s', target: 5 }, // Stay at 5 VUs
		{ duration: '10s', target: 0 }, // Ramp-down
	],
	thresholds: {
		http_req_failed: ['rate<0.01'],
		http_req_duration: ['p(95)<150'],
	},
};

export default function () {
	const res = http.get('http://localhost:3000/health');
	check(res, {
		'status is 200': (r) => r.status === 200,
		'response body checks UP': (r) => r.body.includes('"status":"UP"'),
	});
	sleep(1);
}
