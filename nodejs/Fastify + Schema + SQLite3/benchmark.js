import autocannon from 'autocannon';

const tests = [
    {
        name: 'GET /api/users (with pagination)',
        url: 'http://localhost:3000/api/users?page=1&limit=10'
    },
    {
        name: 'GET /api/users/:id',
        url: 'http://localhost:3000/api/users/1'
    },
    {
        name: 'POST /api/users',
        url: 'http://localhost:3000/api/users',
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            username: 'test_user',
            email: 'test@example.com',
            password: 'password123',
            age: 25
        })
    },
    {
        name: 'Benchmark endpoint (1000 items)',
        url: 'http://localhost:3000/api/benchmark?count=1000'
    }
];

async function runBenchmarks() {
    for (const test of tests) {
        console.log(`\n🏃 Running: ${test.name}`);
        console.log('='.repeat(50));

        const result = await autocannon({
            url: test.url,
            method: test.method || 'GET',
            headers: test.headers,
            body: test.body,
            connections: 100,
            duration: 10,
            pipelining: 1
        });

        console.log(`Requests/sec: ${result.requests.average}`);
        console.log(`Latency (avg): ${result.latency.mean} ms`);
        console.log(`Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
    }
}

runBenchmarks();