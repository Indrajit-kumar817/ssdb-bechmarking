const redis = require('redis');
const net = require('net');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class DatabaseBenchmark {
    constructor(sampleSize = 100000, concurrencyLevels = [1]) {
        this.sampleSize = sampleSize;
        this.concurrencyLevels = concurrencyLevels;
        this.ssdbClient = null;
        this.kvrocksClient = null;
        this.results = {
            ssdb: { set: [], get: [], del: [], errors: 0, storage: 0, totalTime: { set: 0, get: 0, del: 0 } },
            kvrocks: { set: [], get: [], del: [], errors: 0, storage: 0, totalTime: { set: 0, get: 0, del: 0 } }
        };
        this.resourceMetrics = {
            ssdb: { cpu: [], memory: [], timestamps: [] },
            kvrocks: { cpu: [], memory: [], timestamps: [] }
        };
        this.concurrencyResults = {};
    }

    async connectSSDB(host = 'localhost', port = 8890) {
        try {
            this.ssdbClient = new SSDBClient(host, port);
            await this.ssdbClient.connect();

            // Test connection
            await this.ssdbClient.set('test_connection', 'ok');
            await this.ssdbClient.del('test_connection');

            console.log(`✓ Connected to SSDB at ${host}:${port}`);
            return true;
        } catch (error) {
            console.log(`✗ Failed to connect to SSDB: ${error.message}`);
            return false;
        }
    }

    async connectKVRocks(host = 'localhost', port = 6379) {
        try {
            this.kvrocksClient = redis.createClient({
                host: host,
                port: port
            });

            this.kvrocksClient.on('error', (err) => {
                console.log(`KVRocks connection error: ${err}`);
            });

            await this.kvrocksClient.connect();

            // Test connection
            await this.kvrocksClient.set('test_connection', 'ok');
            await this.kvrocksClient.del('test_connection');

            console.log(`✓ Connected to KVRocks at ${host}:${port}`);
            return true;
        } catch (error) {
            console.log(`✗ Failed to connect to KVRocks: ${error.message}`);
            return false;
        }
    }

    generateTestData() {
        const data = [];
        for (let i = 0; i < this.sampleSize; i++) {
            const key = `benchmark_key_${i}`;
            // Create larger JSON documents with nested structure
            const value = JSON.stringify({
                id: i,
                timestamp: Date.now(),
                data: Math.random().toString(36).substring(2, 102),
                metadata: {
                    version: '1.0',
                    tags: [`tag_${i % 10}`, `category_${i % 5}`],
                    score: Math.random() * 100
                },
                content: Array(10).fill(null).map((_, idx) => ({
                    field: `field_${idx}`,
                    value: Math.random().toString(36).substring(2, 20)
                }))
            });
            data.push({ key, value });
        }
        return data;
    }

    async startResourceMonitoring(dbType) {
        const monitoring = setInterval(async () => {
            try {
                const cpuUsage = process.cpuUsage();
                const memUsage = process.memoryUsage();

                this.resourceMetrics[dbType].cpu.push(cpuUsage.user + cpuUsage.system);
                this.resourceMetrics[dbType].memory.push(memUsage.rss / 1024 / 1024); // MB
                this.resourceMetrics[dbType].timestamps.push(Date.now());
            } catch (error) {
                console.log(`Resource monitoring error for ${dbType}: ${error.message}`);
            }
        }, 100); // Monitor every 100ms

        return monitoring;
    }

    stopResourceMonitoring(monitoring) {
        if (monitoring) {
            clearInterval(monitoring);
        }
    }

    async measureStorageSize(dbType) {
        try {
            if (dbType === 'ssdb') {
                // For SSDB, estimate storage by sampling existing keys
                const sampleKeys = [`benchmark_key_0`, `benchmark_key_${Math.floor(this.sampleSize/2)}`, `benchmark_key_${this.sampleSize-1}`];
                let totalSize = 0;
                let validSamples = 0;

                for (const key of sampleKeys) {
                    try {
                        const value = await this.ssdbClient.get(key);
                        if (value && value !== '') {
                            const keySize = Buffer.byteLength(key, 'utf8');
                            const valueSize = Buffer.byteLength(value, 'utf8');
                            totalSize += keySize + valueSize;
                            validSamples++;
                        }
                    } catch (error) {
                        // Key might not exist, skip
                    }
                }

                // If no valid samples found, try to measure from a known data structure
                if (validSamples === 0) {
                    // Create a sample entry to measure storage
                    const testKey = 'storage_test_key';
                    const testValue = JSON.stringify({
                        id: 0,
                        timestamp: Date.now(),
                        data: Math.random().toString(36).substring(2, 102),
                        metadata: {
                            version: '1.0',
                            tags: ['tag_0', 'category_0'],
                            score: Math.random() * 100
                        },
                        content: Array(10).fill(null).map((_, idx) => ({
                            field: `field_${idx}`,
                            value: Math.random().toString(36).substring(2, 20)
                        }))
                    });

                    try {
                        await this.ssdbClient.set(testKey, testValue);
                        const retrievedValue = await this.ssdbClient.get(testKey);
                        if (retrievedValue) {
                            totalSize = Buffer.byteLength(testKey, 'utf8') + Buffer.byteLength(retrievedValue, 'utf8');
                            validSamples = 1;
                        }
                        await this.ssdbClient.del(testKey); // Clean up
                    } catch (error) {
                        console.log(`Storage test failed for SSDB: ${error.message}`);
                    }
                }

                // Estimate total storage (average sample size * total keys that should exist)
                if (validSamples > 0) {
                    const avgKeySize = totalSize / validSamples;
                    // Count how many keys should actually exist (after SET but before DEL operations)
                    const estimatedKeys = this.results.ssdb.set.length;
                    this.results.ssdb.storage = avgKeySize * estimatedKeys;
                } else {
                    this.results.ssdb.storage = 0;
                }

            } else if (dbType === 'kvrocks') {
                // For KVRocks, try Redis memory commands first
                try {
                    const info = await this.kvrocksClient.sendCommand(['INFO', 'memory']);
                    const memoryMatch = info.match(/used_memory:(\d+)/);
                    if (memoryMatch) {
                        this.results.kvrocks.storage = parseInt(memoryMatch[1]);
                        return; // Successfully got memory info, no need for fallback
                    }
                } catch (error) {
                    console.log(`KVRocks INFO memory command failed, falling back to sampling: ${error.message}`);
                }

                // Fallback to sampling approach with improved logic
                const sampleKeys = [`benchmark_key_0`, `benchmark_key_${Math.floor(this.sampleSize/2)}`, `benchmark_key_${this.sampleSize-1}`];
                let totalSize = 0;
                let validSamples = 0;

                for (const key of sampleKeys) {
                    try {
                        const value = await this.kvrocksClient.get(key);
                        if (value && value !== '') {
                            const keySize = Buffer.byteLength(key, 'utf8');
                            const valueSize = Buffer.byteLength(value, 'utf8');
                            totalSize += keySize + valueSize;
                            validSamples++;
                        }
                    } catch (error) {
                        // Key might not exist, skip
                    }
                }

                // If no valid samples found, try to measure from a known data structure
                if (validSamples === 0) {
                    // Create a sample entry to measure storage
                    const testKey = 'storage_test_key_kvrocks';
                    const testValue = JSON.stringify({
                        id: 0,
                        timestamp: Date.now(),
                        data: Math.random().toString(36).substring(2, 102),
                        metadata: {
                            version: '1.0',
                            tags: ['tag_0', 'category_0'],
                            score: Math.random() * 100
                        },
                        content: Array(10).fill(null).map((_, idx) => ({
                            field: `field_${idx}`,
                            value: Math.random().toString(36).substring(2, 20)
                        }))
                    });

                    try {
                        await this.kvrocksClient.set(testKey, testValue);
                        const retrievedValue = await this.kvrocksClient.get(testKey);
                        if (retrievedValue) {
                            totalSize = Buffer.byteLength(testKey, 'utf8') + Buffer.byteLength(retrievedValue, 'utf8');
                            validSamples = 1;
                        }
                        await this.kvrocksClient.del(testKey); // Clean up
                    } catch (error) {
                        console.log(`Storage test failed for KVRocks: ${error.message}`);
                    }
                }

                // Estimate total storage (average sample size * total keys that should exist)
                if (validSamples > 0) {
                    const avgKeySize = totalSize / validSamples;
                    // Count how many keys should actually exist (after SET but before DEL operations)
                    const estimatedKeys = this.results.kvrocks.set.length;
                    this.results.kvrocks.storage = avgKeySize * estimatedKeys;
                } else {
                    this.results.kvrocks.storage = 0;
                }
            }
        } catch (error) {
            console.log(`Storage measurement error for ${dbType}: ${error.message}`);
        }
    }

    async benchmarkSSDBOperation(operation, key, value = null) {
        const startTime = process.hrtime.bigint();
        try {
            switch (operation) {
                case 'set':
                    await this.ssdbClient.set(key, value);
                    break;
                case 'get':
                    await this.ssdbClient.get(key);
                    break;
                case 'del':
                    await this.ssdbClient.del(key);
                    break;
            }
            const endTime = process.hrtime.bigint();
            return Number(endTime - startTime) / 1000000; // Convert to milliseconds
        } catch (error) {
            this.results.ssdb.errors++;
            console.log(`SSDB ${operation} error: ${error.message}`);
            return null;
        }
    }

    async benchmarkKVRocksOperation(operation, key, value = null) {
        const startTime = process.hrtime.bigint();
        try {
            switch (operation) {
                case 'set':
                    await this.kvrocksClient.set(key, value);
                    break;
                case 'get':
                    await this.kvrocksClient.get(key);
                    break;
                case 'del':
                    await this.kvrocksClient.del(key);
                    break;
            }
            const endTime = process.hrtime.bigint();
            return Number(endTime - startTime) / 1000000; // Convert to milliseconds
        } catch (error) {
            this.results.kvrocks.errors++;
            console.log(`KVRocks ${operation} error: ${error.message}`);
            return null;
        }
    }

    async runBenchmark() {
        console.log(`\n🚀 Starting comprehensive benchmark with ${this.sampleSize} operations per test...\n`);

        const testData = this.generateTestData();

        // Run sequential benchmarks
        await this.runSequentialBenchmarks(testData);

        // Run concurrency tests
        console.log("\n🔄 Running concurrency tests...");
        await this.runConcurrencyTests(testData);

        // Display results
        this.displayResults();
    }

    async runSequentialBenchmarks(testData) {
        // Benchmark SET operations
        console.log("📝 Benchmarking SET operations...");
        await this.benchmarkSetOperations(testData);

        // Benchmark GET operations
        console.log("📖 Benchmarking GET operations...");
        await this.benchmarkGetOperations(testData);

        // Measure storage after SET and GET operations, before DELETE
        console.log("💾 Measuring storage footprint...");
        await this.measureAllStorageSizes();

        // Benchmark DELETE operations
        console.log("🗑️  Benchmarking DELETE operations...");
        await this.benchmarkDelOperations(testData);
    }

    async runConcurrencyTests(testData) {
        const totalConcurrencyTests = this.concurrencyLevels.length;

        for (let testIndex = 0; testIndex < this.concurrencyLevels.length; testIndex++) {
            const concurrency = this.concurrencyLevels[testIndex];
            const testProgress = ((testIndex + 1) / totalConcurrencyTests * 100).toFixed(0);
            console.log(`\n  🔄 Testing with ${concurrency} concurrent clients... (${testProgress}% of concurrency tests)`);

            this.concurrencyResults[concurrency] = {
                ssdb: { set: [], get: [], del: [], errors: 0 },
                kvrocks: { set: [], get: [], del: [], errors: 0 }
            };

            // Test each operation type with concurrency
            const chunkSize = Math.ceil(this.sampleSize / 10); // Use 1/10 of data for concurrency tests
            const testChunk = testData.slice(0, chunkSize);

            console.log(`     ⚙️ SET operations (${chunkSize.toLocaleString()} ops)...`);
            await this.benchmarkConcurrentOperations('set', testChunk, concurrency);

            console.log(`     ⚙️ GET operations (${chunkSize.toLocaleString()} ops)...`);
            await this.benchmarkConcurrentOperations('get', testChunk, concurrency);

            console.log(`     ⚙️ DELETE operations (${chunkSize.toLocaleString()} ops)...`);
            await this.benchmarkConcurrentOperations('del', testChunk, concurrency);
        }
    }

    async benchmarkConcurrentOperations(operation, testData, concurrency) {
        const operationsPerWorker = Math.ceil(testData.length / concurrency);
        const workers = [];

        // SSDB concurrent test
        if (this.ssdbClient) {
            const ssdbWorkers = [];
            for (let i = 0; i < concurrency; i++) {
                const workerData = testData.slice(i * operationsPerWorker, (i + 1) * operationsPerWorker);
                ssdbWorkers.push(this.runWorkerOperations('ssdb', operation, workerData, concurrency));
            }

            const ssdbResults = await Promise.all(ssdbWorkers);
            ssdbResults.forEach(results => {
                if (results) {
                    this.concurrencyResults[concurrency].ssdb[operation].push(...results.latencies);
                    this.concurrencyResults[concurrency].ssdb.errors += results.errors;
                }
            });
        }

        // KVRocks concurrent test
        if (this.kvrocksClient) {
            const kvrocksWorkers = [];
            for (let i = 0; i < concurrency; i++) {
                const workerData = testData.slice(i * operationsPerWorker, (i + 1) * operationsPerWorker);
                kvrocksWorkers.push(this.runWorkerOperations('kvrocks', operation, workerData, concurrency));
            }

            const kvrocksResults = await Promise.all(kvrocksWorkers);
            kvrocksResults.forEach(results => {
                if (results) {
                    this.concurrencyResults[concurrency].kvrocks[operation].push(...results.latencies);
                    this.concurrencyResults[concurrency].kvrocks.errors += results.errors;
                }
            });
        }
    }

    async runWorkerOperations(dbType, operation, workerData, concurrency) {
        const latencies = [];
        let errors = 0;

        for (const { key, value } of workerData) {
            try {
                let latency;
                if (dbType === 'ssdb') {
                    latency = await this.benchmarkSSDBOperation(operation, key, value);
                } else {
                    latency = await this.benchmarkKVRocksOperation(operation, key, value);
                }

                if (latency !== null) {
                    latencies.push(latency);
                } else {
                    errors++;
                }
            } catch (error) {
                errors++;
            }
        }

        return { latencies, errors };
    }

    async measureAllStorageSizes() {
        if (this.ssdbClient) {
            await this.measureStorageSize('ssdb');
        }
        if (this.kvrocksClient) {
            await this.measureStorageSize('kvrocks');
        }
    }

    async benchmarkSetOperations(testData) {
        const totalOperations = testData.length;

        // SSDB SET benchmark with resource monitoring
        if (this.ssdbClient) {
            console.log("  📝 SSDB SET operations...");
            const monitoring = await this.startResourceMonitoring('ssdb');
            const ssdbStartTime = process.hrtime.bigint();
            for (let i = 0; i < testData.length; i++) {
                const { key, value } = testData[i];
                const latency = await this.benchmarkSSDBOperation('set', key, value);
                if (latency !== null) {
                    this.results.ssdb.set.push(latency);
                }

                // Show progress every 1% or 1000 operations, whichever is smaller
                const progressInterval = Math.min(1000, Math.ceil(totalOperations / 100));
                if ((i + 1) % progressInterval === 0 || i === totalOperations - 1) {
                    const percentage = ((i + 1) / totalOperations * 100).toFixed(1);
                    const progressBar = this.createProgressBar((i + 1) / totalOperations, 20);
                    process.stdout.write(`\r     ${progressBar} ${percentage}% (${(i + 1).toLocaleString()}/${totalOperations.toLocaleString()})`);
                }
            }

            const ssdbEndTime = process.hrtime.bigint();
            this.results.ssdb.totalTime.set = Number(ssdbEndTime - ssdbStartTime) / 1000000; // Convert to milliseconds
            console.log(""); // New line after progress

            this.stopResourceMonitoring(monitoring);
        }

        // KVRocks SET benchmark with resource monitoring
        if (this.kvrocksClient) {
            console.log("  📝 KVRocks SET operations...");
            const monitoring = await this.startResourceMonitoring('kvrocks');
            const kvrocksStartTime = process.hrtime.bigint();

            for (let i = 0; i < testData.length; i++) {
                const { key, value } = testData[i];
                const latency = await this.benchmarkKVRocksOperation('set', key, value);
                if (latency !== null) {
                    this.results.kvrocks.set.push(latency);
                }

                // Show progress every 1% or 1000 operations, whichever is smaller
                const progressInterval = Math.min(1000, Math.ceil(totalOperations / 100));
                if ((i + 1) % progressInterval === 0 || i === totalOperations - 1) {
                    const percentage = ((i + 1) / totalOperations * 100).toFixed(1);
                    const progressBar = this.createProgressBar((i + 1) / totalOperations, 20);
                    process.stdout.write(`\r     ${progressBar} ${percentage}% (${(i + 1).toLocaleString()}/${totalOperations.toLocaleString()})`);
                }
            }

            const kvrocksEndTime = process.hrtime.bigint();
            this.results.kvrocks.totalTime.set = Number(kvrocksEndTime - kvrocksStartTime) / 1000000; // Convert to milliseconds
            console.log(""); // New line after progress

            this.stopResourceMonitoring(monitoring);
        }
    }

    async benchmarkGetOperations(testData) {
        const totalOperations = testData.length;

        // SSDB GET benchmark with resource monitoring
        if (this.ssdbClient) {
            console.log("  📜 SSDB GET operations...");
            const monitoring = await this.startResourceMonitoring('ssdb');
            const ssdbStartTime = process.hrtime.bigint();

            for (let i = 0; i < testData.length; i++) {
                const { key } = testData[i];
                const latency = await this.benchmarkSSDBOperation('get', key);
                if (latency !== null) {
                    this.results.ssdb.get.push(latency);
                }

                // Show progress every 1% or 1000 operations, whichever is smaller
                const progressInterval = Math.min(1000, Math.ceil(totalOperations / 100));
                if ((i + 1) % progressInterval === 0 || i === totalOperations - 1) {
                    const percentage = ((i + 1) / totalOperations * 100).toFixed(1);
                    const progressBar = this.createProgressBar((i + 1) / totalOperations, 20);
                    process.stdout.write(`\r     ${progressBar} ${percentage}% (${(i + 1).toLocaleString()}/${totalOperations.toLocaleString()})`);
                }
            }

            const ssdbEndTime = process.hrtime.bigint();
            this.results.ssdb.totalTime.get = Number(ssdbEndTime - ssdbStartTime) / 1000000; // Convert to milliseconds
            console.log(""); // New line after progress

            this.stopResourceMonitoring(monitoring);
        }

        // KVRocks GET benchmark with resource monitoring
        if (this.kvrocksClient) {
            console.log("  📜 KVRocks GET operations...");
            const monitoring = await this.startResourceMonitoring('kvrocks');
            const kvrocksStartTime = process.hrtime.bigint();

            for (let i = 0; i < testData.length; i++) {
                const { key } = testData[i];
                const latency = await this.benchmarkKVRocksOperation('get', key);
                if (latency !== null) {
                    this.results.kvrocks.get.push(latency);
                }

                // Show progress every 1% or 1000 operations, whichever is smaller
                const progressInterval = Math.min(1000, Math.ceil(totalOperations / 100));
                if ((i + 1) % progressInterval === 0 || i === totalOperations - 1) {
                    const percentage = ((i + 1) / totalOperations * 100).toFixed(1);
                    const progressBar = this.createProgressBar((i + 1) / totalOperations, 20);
                    process.stdout.write(`\r     ${progressBar} ${percentage}% (${(i + 1).toLocaleString()}/${totalOperations.toLocaleString()})`);
                }
            }

            const kvrocksEndTime = process.hrtime.bigint();
            this.results.kvrocks.totalTime.get = Number(kvrocksEndTime - kvrocksStartTime) / 1000000; // Convert to milliseconds
            console.log(""); // New line after progress

            this.stopResourceMonitoring(monitoring);
        }
    }

    async benchmarkDelOperations(testData) {
        const totalOperations = testData.length;

        // SSDB DELETE benchmark with resource monitoring
        if (this.ssdbClient) {
            console.log("  🗑️ SSDB DELETE operations...");
            const monitoring = await this.startResourceMonitoring('ssdb');
            const ssdbStartTime = process.hrtime.bigint();

            for (let i = 0; i < testData.length; i++) {
                const { key } = testData[i];
                const latency = await this.benchmarkSSDBOperation('del', key);
                if (latency !== null) {
                    this.results.ssdb.del.push(latency);
                }

                // Show progress every 1% or 1000 operations, whichever is smaller
                const progressInterval = Math.min(1000, Math.ceil(totalOperations / 100));
                if ((i + 1) % progressInterval === 0 || i === totalOperations - 1) {
                    const percentage = ((i + 1) / totalOperations * 100).toFixed(1);
                    const progressBar = this.createProgressBar((i + 1) / totalOperations, 20);
                    process.stdout.write(`\r     ${progressBar} ${percentage}% (${(i + 1).toLocaleString()}/${totalOperations.toLocaleString()})`);
                }
            }

            const ssdbEndTime = process.hrtime.bigint();
            this.results.ssdb.totalTime.del = Number(ssdbEndTime - ssdbStartTime) / 1000000; // Convert to milliseconds
            console.log(""); // New line after progress

            this.stopResourceMonitoring(monitoring);
        }

        // KVRocks DELETE benchmark with resource monitoring
        if (this.kvrocksClient) {
            console.log("  🗑️ KVRocks DELETE operations...");
            const monitoring = await this.startResourceMonitoring('kvrocks');
            const kvrocksStartTime = process.hrtime.bigint();

            for (let i = 0; i < testData.length; i++) {
                const { key } = testData[i];
                const latency = await this.benchmarkKVRocksOperation('del', key);
                if (latency !== null) {
                    this.results.kvrocks.del.push(latency);
                }

                // Show progress every 1% or 1000 operations, whichever is smaller
                const progressInterval = Math.min(1000, Math.ceil(totalOperations / 100));
                if ((i + 1) % progressInterval === 0 || i === totalOperations - 1) {
                    const percentage = ((i + 1) / totalOperations * 100).toFixed(1);
                    const progressBar = this.createProgressBar((i + 1) / totalOperations, 20);
                    process.stdout.write(`\r     ${progressBar} ${percentage}% (${(i + 1).toLocaleString()}/${totalOperations.toLocaleString()})`);
                }
            }

            const kvrocksEndTime = process.hrtime.bigint();
            this.results.kvrocks.totalTime.del = Number(kvrocksEndTime - kvrocksStartTime) / 1000000; // Convert to milliseconds
            console.log(""); // New line after progress

            this.stopResourceMonitoring(monitoring);
        }
    }

    createProgressBar(progress, width = 20) {
        const filled = Math.floor(progress * width);
        const empty = width - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        return `[[36m${bar}[0m]`; // Cyan color for progress bar
    }

    calculateStats(latencies) {
        if (!latencies || latencies.length === 0) {
            return {
                count: 0,
                mean: 0,
                median: 0,
                min: 0,
                max: 0,
                stdDev: 0,
                p95: 0,
                p99: 0
            };
        }

        const sorted = [...latencies].sort((a, b) => a - b);
        const sum = latencies.reduce((a, b) => a + b, 0);
        const mean = sum / latencies.length;

        const variance = latencies.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / latencies.length;
        const stdDev = Math.sqrt(variance);

        return {
            count: latencies.length,
            mean: mean,
            median: sorted[Math.floor(sorted.length / 2)],
            min: Math.min(...latencies),
            max: Math.max(...latencies),
            stdDev: stdDev,
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }

    displayResults() {
        console.log("\n" + "=".repeat(100));
        console.log("📊 COMPREHENSIVE BENCHMARK RESULTS");
        console.log("=".repeat(100));

        // Calculate statistics for each operation and database
        const stats = {};
        for (const db of ['ssdb', 'kvrocks']) {
            stats[db] = {};
            for (const operation of ['set', 'get', 'del']) {
                stats[db][operation] = this.calculateStats(this.results[db][operation]);
            }
        }

        // Display sequential operation results
        this.displaySequentialResults(stats);

        // Display concurrency results
        this.displayConcurrencyResults();

        // Display storage comparison
        this.displayStorageResults();

        // Display total time comparison
        this.displayTotalTimeResults();

        // Display resource utilization
        this.displayResourceUtilization();

        // Overall summary
        this.displayOverallSummary(stats);

        // Save detailed results to JSON
        this.saveResultsToFile(stats);
        console.log(`\n✅ Comprehensive benchmark completed! Results saved to benchmark_results.json`);
    }

    displaySequentialResults(stats) {
        console.log("\n" + "=".repeat(80));
        console.log(`🔸 SEQUENTIAL OPERATION RESULTS (Dataset: ${this.sampleSize.toLocaleString()} documents)`);
        console.log("=".repeat(80));

        const operations = ['set', 'get', 'del'];
        for (const operation of operations) {
            console.log(`\n📈 ${operation.toUpperCase()} Operation (ms):`);
            console.log("-".repeat(70));

            // Header
            console.log(`${'Metric'.padEnd(12)} ${'SSDB'.padEnd(12)} ${'KVRocks'.padEnd(12)} ${'Improvement'.padEnd(15)} ${'Winner'.padEnd(10)}`);
            console.log("-".repeat(70));

            const metrics = ['mean', 'median', 'min', 'max', 'p95', 'p99'];
            for (const metric of metrics) {
                const ssdbVal = stats.ssdb[operation][metric];
                const kvrocksVal = stats.kvrocks[operation][metric];

                // Determine winner and improvement
                let winner, improvement = '';
                if (ssdbVal === 0 && kvrocksVal === 0) {
                    winner = "Tie";
                } else if (ssdbVal === 0) {
                    winner = "KVRocks";
                } else if (kvrocksVal === 0) {
                    winner = "SSDB";
                } else {
                    winner = ssdbVal < kvrocksVal ? "SSDB" : "KVRocks";
                    const fasterVal = Math.min(ssdbVal, kvrocksVal);
                    const slowerVal = Math.max(ssdbVal, kvrocksVal);
                    improvement = `${((slowerVal - fasterVal) / slowerVal * 100).toFixed(1)}%`;
                }

                console.log(`${metric.toUpperCase().padEnd(12)} ${ssdbVal.toFixed(3).padEnd(12)} ${kvrocksVal.toFixed(3).padEnd(12)} ${improvement.padEnd(15)} ${winner.padEnd(10)}`);
            }

            console.log(`${'ERRORS'.padEnd(12)} ${this.results.ssdb.errors.toString().padEnd(12)} ${this.results.kvrocks.errors.toString().padEnd(12)} ${'-'.padEnd(15)} ${'-'.padEnd(10)}`);
        }
    }

    displayConcurrencyResults() {
        console.log("\n" + "=".repeat(80));
        console.log("⚡ CONCURRENCY IMPACT ANALYSIS");
        console.log("=".repeat(80));

        for (const [concurrency, results] of Object.entries(this.concurrencyResults)) {
            console.log(`\n🔄 ${concurrency} Concurrent Clients:`);
            console.log("-".repeat(50));

            const operations = ['set', 'get', 'del'];
            for (const operation of operations) {
                const ssdbStats = this.calculateStats(results.ssdb[operation]);
                const kvrocksStats = this.calculateStats(results.kvrocks[operation]);

                console.log(`  ${operation.toUpperCase()}: SSDB=${ssdbStats.mean.toFixed(3)}ms, KVRocks=${kvrocksStats.mean.toFixed(3)}ms`);
            }
        }
    }

    displayStorageResults() {
        console.log("\n" + "=".repeat(80));
        console.log("💾 STORAGE FOOTPRINT COMPARISON (JSON-to-JSON)");
        console.log("=".repeat(80));

        console.log(`\n📦 Storage Usage:`);
        console.log("-".repeat(50));

        const ssdbStorage = this.results.ssdb.storage;
        const kvrocksStorage = this.results.kvrocks.storage;

        console.log(`SSDB Storage:     ${(ssdbStorage / 1024).toFixed(2)} KB`);
        console.log(`KVRocks Storage:  ${(kvrocksStorage / 1024).toFixed(2)} KB`);

        if (ssdbStorage > 0 && kvrocksStorage > 0) {
            const difference = Math.abs(ssdbStorage - kvrocksStorage);
            const percentDiff = (difference / Math.max(ssdbStorage, kvrocksStorage)) * 100;
            const winner = ssdbStorage < kvrocksStorage ? "SSDB" : "KVRocks";

            console.log(`Difference:       ${(difference / 1024).toFixed(2)} KB (${percentDiff.toFixed(1)}%)`);
            console.log(`🏆 ${winner} uses less storage`);
        }
    }

    displayTotalTimeResults() {
        console.log("\n" + "=".repeat(80));
        console.log("⏱️  TOTAL TIME COMPARISON FOR 100,000 RECORDS");
        console.log("=".repeat(80));

        console.log(`\n⏱️  Total Time for ${this.sampleSize.toLocaleString()} operations:`);
        console.log("-".repeat(75));

        // Header for all operations (displayed in seconds)
        console.log(`${'Operation'.padEnd(15)} ${'SSDB (sec)'.padEnd(15)} ${'KVRocks (sec)'.padEnd(15)} ${'Difference'.padEnd(18)} ${'Winner'.padEnd(10)}`);
        console.log("-".repeat(75));

        const operations = ['set', 'get', 'del'];
        for (const operation of operations) {
            const ssdbTime = this.results.ssdb.totalTime[operation];
            const kvrocksTime = this.results.kvrocks.totalTime[operation];

            // Display all operations in seconds
            let winner, difference = '';
            if (ssdbTime === 0 && kvrocksTime === 0) {
                winner = "N/A";
                difference = "N/A";
            } else if (ssdbTime === 0) {
                winner = "KVRocks";
                difference = "N/A";
            } else if (kvrocksTime === 0) {
                winner = "SSDB";
                difference = "N/A";
            } else {
                winner = ssdbTime < kvrocksTime ? "SSDB" : "KVRocks";
                const timeDiff = Math.abs(ssdbTime - kvrocksTime);
                const percentage = (timeDiff / Math.max(ssdbTime, kvrocksTime) * 100).toFixed(1);
                difference = `${(timeDiff / 1000).toFixed(2)}s (${percentage}%)`;
            }

            console.log(`${operation.toUpperCase().padEnd(15)} ${(ssdbTime / 1000).toFixed(2).padEnd(15)} ${(kvrocksTime / 1000).toFixed(2).padEnd(15)} ${difference.padEnd(18)} ${winner.padEnd(10)}`);
        }

        // Calculate and display combined totals in seconds
        const ssdbTotal = this.results.ssdb.totalTime.set + this.results.ssdb.totalTime.get + this.results.ssdb.totalTime.del;
        const kvrocksTotal = this.results.kvrocks.totalTime.set + this.results.kvrocks.totalTime.get + this.results.kvrocks.totalTime.del;

        console.log("-".repeat(75));
        if (ssdbTotal > 0 && kvrocksTotal > 0) {
            const totalDiff = Math.abs(ssdbTotal - kvrocksTotal);
            const totalPercentage = (totalDiff / Math.max(ssdbTotal, kvrocksTotal) * 100).toFixed(1);
            const totalWinner = ssdbTotal < kvrocksTotal ? "SSDB" : "KVRocks";
            const totalDifference = `${(totalDiff / 1000).toFixed(2)}s (${totalPercentage}%)`;

            console.log(`${'TOTAL'.padEnd(15)} ${(ssdbTotal / 1000).toFixed(2).padEnd(15)} ${(kvrocksTotal / 1000).toFixed(2).padEnd(15)} ${totalDifference.padEnd(18)} ${totalWinner.padEnd(10)}`);
        }
    }

    displayResourceUtilization() {
        console.log("\n" + "=".repeat(80));
        console.log("📊 RESOURCE UTILIZATION");
        console.log("=".repeat(80));

        for (const db of ['ssdb', 'kvrocks']) {
            const metrics = this.resourceMetrics[db];
            if (metrics.cpu.length > 0) {
                const avgCpu = metrics.cpu.reduce((a, b) => a + b, 0) / metrics.cpu.length;
                const maxCpu = Math.max(...metrics.cpu);
                const avgMemory = metrics.memory.reduce((a, b) => a + b, 0) / metrics.memory.length;
                const maxMemory = Math.max(...metrics.memory);

                console.log(`\n🔧 ${db.toUpperCase()} Resource Usage:`);
                console.log(`  CPU: Avg=${avgCpu.toFixed(0)}μs, Peak=${maxCpu.toFixed(0)}μs`);
                console.log(`  Memory: Avg=${avgMemory.toFixed(1)}MB, Peak=${maxMemory.toFixed(1)}MB`);
            }
        }
    }

    displayOverallSummary(stats) {
        console.log("\n" + "=".repeat(80));
        console.log("🏁 OVERALL PERFORMANCE SUMMARY");
        console.log("=".repeat(80));

        const operations = ['set', 'get', 'del'];
        let ssdbAvg = 0;
        let kvrocksAvg = 0;
        let totalOps = 0;

        for (const operation of operations) {
            const ssdbOps = this.results.ssdb[operation].length;
            const kvrocksOps = this.results.kvrocks[operation].length;

            if (ssdbOps > 0) {
                const ssdbMean = stats.ssdb[operation].mean;
                ssdbAvg += ssdbMean * ssdbOps;
                totalOps += ssdbOps;
            }

            if (kvrocksOps > 0) {
                const kvrocksMean = stats.kvrocks[operation].mean;
                kvrocksAvg += kvrocksMean * kvrocksOps;
            }
        }

        if (totalOps > 0) {
            ssdbAvg /= totalOps;
            kvrocksAvg /= totalOps;

            console.log(`\n📈 Performance Summary:`);
            console.log(`  Dataset Size:     ${this.sampleSize.toLocaleString()} documents`);
            console.log(`  SSDB Average:     ${ssdbAvg.toFixed(3)} ms`);
            console.log(`  KVRocks Average:  ${kvrocksAvg.toFixed(3)} ms`);

            if (ssdbAvg < kvrocksAvg) {
                const improvement = ((kvrocksAvg - ssdbAvg) / kvrocksAvg) * 100;
                console.log(`  🏆 SSDB is ${improvement.toFixed(1)}% faster overall`);
            } else {
                const improvement = ((ssdbAvg - kvrocksAvg) / ssdbAvg) * 100;
                console.log(`  🏆 KVRocks is ${improvement.toFixed(1)}% faster overall`);
            }

            // Throughput calculation
            const ssdbThroughput = 1000 / ssdbAvg; // ops per second
            const kvrocksThroughput = 1000 / kvrocksAvg;

            console.log(`\n⚡ Throughput (ops/sec):`);
            console.log(`  SSDB:     ${ssdbThroughput.toFixed(0)} ops/sec`);
            console.log(`  KVRocks:  ${kvrocksThroughput.toFixed(0)} ops/sec`);
        }
    }

    saveResultsToFile(stats) {
        const detailedResults = {
            timestamp: new Date().toISOString(),
            sampleSize: this.sampleSize,
            concurrencyLevels: this.concurrencyLevels,
            statistics: stats,
            rawData: this.results,
            concurrencyResults: this.concurrencyResults,
            resourceMetrics: this.resourceMetrics,
            totalTimeComparison: {
                ssdb: {
                    set: this.results.ssdb.totalTime.set,
                    get: this.results.ssdb.totalTime.get,
                    del: this.results.ssdb.totalTime.del,
                    total: this.results.ssdb.totalTime.set + this.results.ssdb.totalTime.get + this.results.ssdb.totalTime.del
                },
                kvrocks: {
                    set: this.results.kvrocks.totalTime.set,
                    get: this.results.kvrocks.totalTime.get,
                    del: this.results.kvrocks.totalTime.del,
                    total: this.results.kvrocks.totalTime.set + this.results.kvrocks.totalTime.get + this.results.kvrocks.totalTime.del
                }
            },
            storageComparison: {
                ssdb: {
                    storage: this.results.ssdb.storage,
                    storageKB: (this.results.ssdb.storage / 1024).toFixed(2)
                },
                kvrocks: {
                    storage: this.results.kvrocks.storage,
                    storageKB: (this.results.kvrocks.storage / 1024).toFixed(2)
                }
            }
        };

        fs.writeFileSync('benchmark_results.json', JSON.stringify(detailedResults, null, 2));
    }

    async close() {
        if (this.ssdbClient) {
            await this.ssdbClient.disconnect();
        }
        if (this.kvrocksClient) {
            await this.kvrocksClient.disconnect();
        }
    }
}

// SSDB Client implementation using raw sockets
class SSDBClient {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.socket = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();

            this.socket.connect(this.port, this.host, () => {
                resolve();
            });

            this.socket.on('error', (error) => {
                reject(error);
            });
        });
    }

    async sendCommand(command, ...args) {
        return new Promise((resolve, reject) => {
            const parts = [command, ...args];
            let request = '';

            for (const part of parts) {
                const str = part.toString();
                request += str.length + '\n' + str + '\n';
            }
            request += '\n';

            this.socket.write(request);

            let buffer = '';
            const onData = (data) => {
                buffer += data.toString();

                // Simple response parsing for SSDB protocol
                const lines = buffer.split('\n');
                if (lines.length >= 3) {
                    this.socket.off('data', onData);
                    const status = lines[1];
                    if (status === 'ok') {
                        resolve(lines[3] || null);
                    } else {
                        reject(new Error(`SSDB error: ${status}`));
                    }
                }
            };

            this.socket.on('data', onData);

            setTimeout(() => {
                this.socket.off('data', onData);
                reject(new Error('SSDB operation timeout'));
            }, 5000);
        });
    }

    async set(key, value) {
        return this.sendCommand('set', key, value);
    }

    async get(key) {
        return this.sendCommand('get', key);
    }

    async del(key) {
        return this.sendCommand('del', key);
    }

    async disconnect() {
        if (this.socket) {
            this.socket.end();
        }
    }
}

async function main() {
    console.log("🔥 SSDB vs KVRocks Comprehensive Benchmark Tool");
    console.log("=".repeat(60));

    // Use default 100k documents and concurrency levels [1, 10, 50, 100]
    const benchmark = new DatabaseBenchmark();

    console.log(`📊 Benchmark Configuration:`);
    console.log(`   Dataset Size: ${benchmark.sampleSize.toLocaleString()} documents`);
    console.log(`   Concurrency Levels: ${benchmark.concurrencyLevels.join(', ')} clients`);
    console.log(`   Document Type: JSON with nested structures`);

    // Try to connect to both databases
    const ssdbConnected = await benchmark.connectSSDB('localhost', 8890);
    const kvrocksConnected = await benchmark.connectKVRocks('localhost', 6379);

    if (!ssdbConnected && !kvrocksConnected) {
        console.log("❌ Could not connect to any database. Please ensure SSDB and/or KVRocks are running.");
        return;
    }

    if (!ssdbConnected) {
        console.log("⚠️  SSDB not available. Running benchmark for KVRocks only.");
    }

    if (!kvrocksConnected) {
        console.log("⚠️  KVRocks not available. Running benchmark for SSDB only.");
    }

    try {
        await benchmark.runBenchmark();
    } catch (error) {
        console.error("Benchmark failed:", error);
    } finally {
        await benchmark.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DatabaseBenchmark;