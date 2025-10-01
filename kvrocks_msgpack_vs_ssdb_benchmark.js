const redis = require('redis');
const msgpack = require('msgpack');
const net = require('net');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class KVrocksMessagePackVsSSDBBenchmark {
    constructor(sampleSize = 100000, concurrencyLevels = [1, 10, 50, 100]) {
        this.sampleSize = sampleSize;
        this.concurrencyLevels = concurrencyLevels;
        this.ssdbClient = null;
        this.kvrocksClient = null;
        this.results = {
            ssdb: { 
                set: [], get: [], del: [], 
                errors: 0, 
                storage: 0, 
                totalTime: { set: 0, get: 0, del: 0 },
                compressionRatio: 1,
                originalDataSize: 0,
                compressedDataSize: 0
            },
            kvrocks_msgpack: { 
                set: [], get: [], del: [], 
                errors: 0, 
                storage: 0, 
                totalTime: { set: 0, get: 0, del: 0 },
                compressionRatio: 1,
                originalDataSize: 0,
                compressedDataSize: 0,
                compressionOverhead: []
            }
        };
        this.resourceMetrics = {
            ssdb: { cpu: [], memory: [], timestamps: [] },
            kvrocks_msgpack: { cpu: [], memory: [], timestamps: [] }
        };
        this.monitoring = null;
        this.concurrencyResults = {};
    }

    generateTestData(index) {
        // Generate realistic data that can benefit from compression
        const testObject = {
            id: index,
            user: {
                name: `User_${index}`,
                email: `user${index}@example.com`,
                profile: {
                    age: Math.floor(Math.random() * 80) + 18,
                    city: ['New York', 'London', 'Tokyo', 'Paris', 'Berlin'][Math.floor(Math.random() * 5)],
                    preferences: {
                        theme: 'dark',
                        language: 'en',
                        notifications: true,
                        privacy: 'public'
                    }
                }
            },
            metadata: {
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                version: '1.0.0',
                tags: ['user', 'profile', 'active'],
                description: `This is a test record for user ${index} with some additional metadata that will help test compression efficiency.`
            },
            data: {
                scores: Array.from({length: 10}, () => Math.floor(Math.random() * 100)),
                settings: {
                    autoSave: true,
                    backup: true,
                    sync: true,
                    compression: 'auto'
                }
            }
        };
        return testObject;
    }

    calculateDataSize(data) {
        return Buffer.byteLength(JSON.stringify(data), 'utf8');
    }

    startResourceMonitoring(dbType) {
        this.monitoring = setInterval(() => {
            try {
                const cpuUsage = process.cpuUsage();
                const memUsage = process.memoryUsage();

                this.resourceMetrics[dbType].cpu.push(cpuUsage.user + cpuUsage.system);
                this.resourceMetrics[dbType].memory.push(memUsage.rss / 1024 / 1024); // MB
                this.resourceMetrics[dbType].timestamps.push(Date.now());
            } catch (error) {
                // Ignore monitoring errors
            }
        }, 100); // Monitor every 100ms
    }

    stopResourceMonitoring() {
        if (this.monitoring) {
            clearInterval(this.monitoring);
            this.monitoring = null;
        }
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
                socket: {
                    host: host,
                    port: port
                }
            });

            await this.kvrocksClient.connect();

            // Test connection
            await this.kvrocksClient.set('test_connection', 'ok');
            await this.kvrocksClient.del('test_connection');

            console.log(`✓ Connected to KVrocks at ${host}:${port}`);
            return true;
        } catch (error) {
            console.log(`✗ Failed to connect to KVrocks: ${error.message}`);
            return false;
        }
    }

    async benchmarkSSDBOperations() {
        console.log('\n🔄 Benchmarking SSDB with built-in compression...');
        
        const keys = [];
        const testData = [];
        let totalOriginalSize = 0;

        // Generate test data
        console.log('🔄 Generating test data...');
        for (let i = 0; i < this.sampleSize; i++) {
            const data = this.generateTestData(i);
            keys.push(`ssdb_key_${i}`);
            testData.push(JSON.stringify(data));
            totalOriginalSize += this.calculateDataSize(data);

            // Progress indicator
            if ((i + 1) % 100 === 0 || i === this.sampleSize - 1) {
                const progress = ((i + 1) / this.sampleSize * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${this.sampleSize})`);
            }
        }
        console.log(''); // New line

        this.results.ssdb.originalDataSize = totalOriginalSize;

        // SET operations
        console.log('📝 Testing SSDB SET operations...');
        this.startResourceMonitoring('ssdb');
        const setStartTime = Date.now();
        for (let i = 0; i < this.sampleSize; i++) {
            const operationStart = process.hrtime.bigint();
            try {
                await this.ssdbClient.set(keys[i], testData[i]);
                const operationEnd = process.hrtime.bigint();
                this.results.ssdb.set.push(Number(operationEnd - operationStart) / 1000000);
            } catch (error) {
                this.results.ssdb.errors++;
                console.error(`SSDB SET error for key ${keys[i]}:`, error.message);
            }

            // Progress indicator
            if ((i + 1) % 1000 === 0 || i === this.sampleSize - 1) {
                const progress = ((i + 1) / this.sampleSize * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${this.sampleSize})`);
            }
        }
        console.log(''); // New line
        this.results.ssdb.totalTime.set = Date.now() - setStartTime;

        // GET operations
        console.log('📖 Testing SSDB GET operations...');
        const getStartTime = Date.now();
        for (let i = 0; i < this.sampleSize; i++) {
            const operationStart = process.hrtime.bigint();
            try {
                await this.ssdbClient.get(keys[i]);
                const operationEnd = process.hrtime.bigint();
                this.results.ssdb.get.push(Number(operationEnd - operationStart) / 1000000);
            } catch (error) {
                this.results.ssdb.errors++;
                console.error(`SSDB GET error for key ${keys[i]}:`, error.message);
            }

            // Progress indicator
            if ((i + 1) % 1000 === 0 || i === this.sampleSize - 1) {
                const progress = ((i + 1) / this.sampleSize * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${this.sampleSize})`);
            }
        }
        console.log(''); // New line
        this.results.ssdb.totalTime.get = Date.now() - getStartTime;
        this.stopResourceMonitoring();

        // Calculate storage size based on JSON string data
        console.log('💾 Calculating SSDB storage size...');
        let totalStoredSize = 0;

        // Add up the JSON string sizes + key sizes (SSDB stores JSON as strings)
        for (let i = 0; i < this.sampleSize; i++) {
            totalStoredSize += Buffer.byteLength(keys[i], 'utf8'); // Key size
            totalStoredSize += Buffer.byteLength(testData[i], 'utf8'); // JSON string value size
        }

        this.results.ssdb.storage = totalStoredSize;
        this.results.ssdb.compressedDataSize = totalStoredSize;
        this.results.ssdb.compressionRatio = totalOriginalSize / totalStoredSize;

        // DELETE operations - COMMENTED OUT FOR FASTER TESTING
        /*
        console.log('🗑️ Testing SSDB DELETE operations...');
        const delStartTime = Date.now();
        for (let i = 0; i < this.sampleSize; i++) {
            const operationStart = process.hrtime.bigint();
            try {
                await this.ssdbClient.del(keys[i]);
                const operationEnd = process.hrtime.bigint();
                this.results.ssdb.del.push(Number(operationEnd - operationStart) / 1000000);
            } catch (error) {
                this.results.ssdb.errors++;
                console.error(`SSDB DEL error for key ${keys[i]}:`, error.message);
            }

            // Progress indicator
            if ((i + 1) % 1000 === 0 || i === this.sampleSize - 1) {
                const progress = ((i + 1) / this.sampleSize * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${this.sampleSize})`);
            }
        }
        console.log(''); // New line
        this.results.ssdb.totalTime.del = Date.now() - delStartTime;
        */
    }

    async benchmarkKVrocksMessagePackOperations() {
        console.log('\n🔄 Benchmarking KVrocks with MessagePack compression...');
        
        const keys = [];
        const testData = [];
        const compressedData = [];
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;
        
        // Generate and compress test data
        console.log('🔄 Generating and compressing test data...');
        for (let i = 0; i < this.sampleSize; i++) {
            const data = this.generateTestData(i);
            const originalSize = this.calculateDataSize(data);
            totalOriginalSize += originalSize;

            const compressionStart = process.hrtime.bigint();
            const compressed = msgpack.pack(data);
            const compressionEnd = process.hrtime.bigint();

            const compressedSize = compressed.length;
            totalCompressedSize += compressedSize;

            keys.push(`kvrocks_msgpack_key_${i}`);
            testData.push(data);
            compressedData.push(compressed);

            this.results.kvrocks_msgpack.compressionOverhead.push(
                Number(compressionEnd - compressionStart) / 1000000
            );

            // Progress indicator
            if ((i + 1) % 100 === 0 || i === this.sampleSize - 1) {
                const progress = ((i + 1) / this.sampleSize * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${this.sampleSize})`);
            }
        }
        console.log(''); // New line
        
        this.results.kvrocks_msgpack.originalDataSize = totalOriginalSize;
        this.results.kvrocks_msgpack.compressedDataSize = totalCompressedSize;
        this.results.kvrocks_msgpack.compressionRatio = totalOriginalSize / totalCompressedSize;

        // SET operations
        console.log('📝 Testing KVrocks+MessagePack SET operations...');
        this.startResourceMonitoring('kvrocks_msgpack');
        const setStartTime = Date.now();
        for (let i = 0; i < this.sampleSize; i++) {
            const operationStart = process.hrtime.bigint();
            try {
                await this.kvrocksClient.set(keys[i], compressedData[i]);
                const operationEnd = process.hrtime.bigint();
                this.results.kvrocks_msgpack.set.push(Number(operationEnd - operationStart) / 1000000);
            } catch (error) {
                this.results.kvrocks_msgpack.errors++;
                console.error(`KVrocks SET error for key ${keys[i]}:`, error.message);
            }

            // Progress indicator
            if ((i + 1) % 1000 === 0 || i === this.sampleSize - 1) {
                const progress = ((i + 1) / this.sampleSize * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${this.sampleSize})`);
            }
        }
        console.log(''); // New line
        this.results.kvrocks_msgpack.totalTime.set = Date.now() - setStartTime;

        // GET operations
        console.log('📖 Testing KVrocks+MessagePack GET operations...');
        const getStartTime = Date.now();
        for (let i = 0; i < this.sampleSize; i++) {
            const operationStart = process.hrtime.bigint();
            try {
                // Use sendCommand with GET to retrieve buffer
                const compressed = await this.kvrocksClient.sendCommand(['GET', keys[i]], { returnBuffers: true });
                if (compressed) {
                    // Convert to Buffer if it's not already
                    const buffer = Buffer.isBuffer(compressed) ? compressed : Buffer.from(compressed);
                    const decompressed = msgpack.unpack(buffer);
                }
                const operationEnd = process.hrtime.bigint();
                this.results.kvrocks_msgpack.get.push(Number(operationEnd - operationStart) / 1000000);
            } catch (error) {
                this.results.kvrocks_msgpack.errors++;
                console.error(`KVrocks GET error for key ${keys[i]}:`, error.message);
            }

            // Progress indicator
            if ((i + 1) % 1000 === 0 || i === this.sampleSize - 1) {
                const progress = ((i + 1) / this.sampleSize * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${this.sampleSize})`);
            }
        }
        console.log(''); // New line
        this.results.kvrocks_msgpack.totalTime.get = Date.now() - getStartTime;
        this.stopResourceMonitoring();

        // Calculate storage size using actual compressed data size
        console.log('💾 Calculating KVrocks storage size...');
        let totalStoredSize = 0;

        // Add up the actual compressed buffer sizes + key sizes
        for (let i = 0; i < this.sampleSize; i++) {
            totalStoredSize += Buffer.byteLength(keys[i], 'utf8'); // Key size
            totalStoredSize += compressedData[i].length; // Compressed value size
        }

        this.results.kvrocks_msgpack.storage = totalStoredSize;

        // DELETE operations - COMMENTED OUT FOR FASTER TESTING
        /*
        console.log('🗑️ Testing KVrocks+MessagePack DELETE operations...');
        const delStartTime = Date.now();
        for (let i = 0; i < this.sampleSize; i++) {
            const operationStart = process.hrtime.bigint();
            try {
                await this.kvrocksClient.del(keys[i]);
                const operationEnd = process.hrtime.bigint();
                this.results.kvrocks_msgpack.del.push(Number(operationEnd - operationStart) / 1000000);
            } catch (error) {
                this.results.kvrocks_msgpack.errors++;
                console.error(`KVrocks DEL error for key ${keys[i]}:`, error.message);
            }

            // Progress indicator
            if ((i + 1) % 1000 === 0 || i === this.sampleSize - 1) {
                const progress = ((i + 1) / this.sampleSize * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${this.sampleSize})`);
            }
        }
        console.log(''); // New line
        this.results.kvrocks_msgpack.totalTime.del = Date.now() - delStartTime;
        */
    }

    async getSSDBStorageInfo() {
        try {
            const info = await this.ssdbClient.info();
            // Parse storage information from SSDB info
            const sizeMatch = info.match(/used_memory:(\d+)/);
            return sizeMatch ? parseInt(sizeMatch[1]) : 0;
        } catch (error) {
            console.error('Error getting SSDB storage info:', error.message);
            return 0;
        }
    }

    async getKVrocksStorageInfo() {
        try {
            const info = await this.kvrocksClient.info('memory');
            const sizeMatch = info.match(/used_memory:(\d+)/);
            return sizeMatch ? parseInt(sizeMatch[1]) : 0;
        } catch (error) {
            console.error('Error getting KVrocks storage info:', error.message);
            return 0;
        }
    }

    calculateStats(times) {
        if (times.length === 0) return { avg: 0, median: 0, min: 0, max: 0, p95: 0, p99: 0 };

        const sorted = times.slice().sort((a, b) => a - b);
        const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];

        return { avg, median, min, max, p95, p99 };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    generateComparativeReport() {
        const report = {
            timestamp: new Date().toISOString(),
            sampleSize: this.sampleSize,
            comparison: 'KVrocks+MessagePack vs SSDB',
            
            // Performance metrics
            performance: {
                ssdb: {
                    set: this.calculateStats(this.results.ssdb.set),
                    get: this.calculateStats(this.results.ssdb.get),
                    del: this.calculateStats(this.results.ssdb.del),
                    totalTime: this.results.ssdb.totalTime,
                    errors: this.results.ssdb.errors
                },
                kvrocks_msgpack: {
                    set: this.calculateStats(this.results.kvrocks_msgpack.set),
                    get: this.calculateStats(this.results.kvrocks_msgpack.get),
                    del: this.calculateStats(this.results.kvrocks_msgpack.del),
                    totalTime: this.results.kvrocks_msgpack.totalTime,
                    errors: this.results.kvrocks_msgpack.errors,
                    compressionOverhead: this.calculateStats(this.results.kvrocks_msgpack.compressionOverhead)
                }
            },
            
            // Storage efficiency
            storage: {
                ssdb: {
                    originalDataSize: this.results.ssdb.originalDataSize,
                    compressedDataSize: this.results.ssdb.compressedDataSize,
                    compressionRatio: this.results.ssdb.compressionRatio,
                    storageUsed: this.results.ssdb.storage,
                    compressionType: 'Built-in automatic compression'
                },
                kvrocks_msgpack: {
                    originalDataSize: this.results.kvrocks_msgpack.originalDataSize,
                    compressedDataSize: this.results.kvrocks_msgpack.compressedDataSize,
                    compressionRatio: this.results.kvrocks_msgpack.compressionRatio,
                    storageUsed: this.results.kvrocks_msgpack.storage,
                    compressionType: 'Client-side MessagePack compression'
                }
            },
            
            // Comparative analysis
            analysis: {
                performanceWinner: null,
                storageWinner: null,
                overallRecommendation: null,
                keyFindings: []
            }
        };

        // Determine performance winner
        const ssdbAvgLatency = (report.performance.ssdb.set.avg + report.performance.ssdb.get.avg + report.performance.ssdb.del.avg) / 3;
        const kvrocksAvgLatency = (report.performance.kvrocks_msgpack.set.avg + report.performance.kvrocks_msgpack.get.avg + report.performance.kvrocks_msgpack.del.avg) / 3;
        
        if (kvrocksAvgLatency < ssdbAvgLatency) {
            report.analysis.performanceWinner = 'KVrocks+MessagePack';
            const improvement = ((ssdbAvgLatency - kvrocksAvgLatency) / ssdbAvgLatency * 100).toFixed(1);
            report.analysis.keyFindings.push(`KVrocks+MessagePack is ${improvement}% faster than SSDB`);
        } else {
            report.analysis.performanceWinner = 'SSDB';
            const improvement = ((kvrocksAvgLatency - ssdbAvgLatency) / kvrocksAvgLatency * 100).toFixed(1);
            report.analysis.keyFindings.push(`SSDB is ${improvement}% faster than KVrocks+MessagePack`);
        }

        // Determine storage efficiency winner
        if (report.storage.kvrocks_msgpack.compressionRatio > report.storage.ssdb.compressionRatio) {
            report.analysis.storageWinner = 'KVrocks+MessagePack';
            report.analysis.keyFindings.push(`KVrocks+MessagePack achieves better compression ratio: ${report.storage.kvrocks_msgpack.compressionRatio.toFixed(2)}x vs ${report.storage.ssdb.compressionRatio.toFixed(2)}x`);
        } else {
            report.analysis.storageWinner = 'SSDB';
            report.analysis.keyFindings.push(`SSDB achieves better compression ratio: ${report.storage.ssdb.compressionRatio.toFixed(2)}x vs ${report.storage.kvrocks_msgpack.compressionRatio.toFixed(2)}x`);
        }

        // Overall recommendation
        if (report.analysis.performanceWinner === 'KVrocks+MessagePack' && report.analysis.storageWinner === 'KVrocks+MessagePack') {
            report.analysis.overallRecommendation = 'KVrocks+MessagePack provides both better performance and storage efficiency';
        } else if (report.analysis.performanceWinner === 'SSDB' && report.analysis.storageWinner === 'SSDB') {
            report.analysis.overallRecommendation = 'SSDB provides both better performance and storage efficiency';
        } else {
            report.analysis.overallRecommendation = 'Trade-off between performance and storage efficiency - choice depends on use case priorities';
        }

        return report;
    }

    async printDetailedResults() {
        console.log('\n' + '='.repeat(80));
        console.log('🏆 KVROCKS+MESSAGEPACK VS SSDB BENCHMARK RESULTS');
        console.log('='.repeat(80));

        const ssdbStats = {
            set: this.calculateStats(this.results.ssdb.set),
            get: this.calculateStats(this.results.ssdb.get),
            del: this.calculateStats(this.results.ssdb.del)
        };

        const kvrocksStats = {
            set: this.calculateStats(this.results.kvrocks_msgpack.set),
            get: this.calculateStats(this.results.kvrocks_msgpack.get),
            del: this.calculateStats(this.results.kvrocks_msgpack.del)
        };

        // Sequential Operation Results
        console.log('\n' + '='.repeat(80));
        console.log(`📊 SEQUENTIAL OPERATION RESULTS (Dataset: ${this.sampleSize.toLocaleString()} documents)`);
        console.log('='.repeat(80));

        const operations = ['set', 'get'];
        for (const op of operations) {
            console.log(`\n📈 ${op.toUpperCase()} Operation (ms):`);
            console.log('-'.repeat(70));
            console.log(`${'Metric'.padEnd(12)} ${'SSDB'.padEnd(12)} ${'KVRocks+MP'.padEnd(12)} ${'Improvement'.padEnd(15)} ${'Winner'.padEnd(10)}`);
            console.log('-'.repeat(70));

            const metrics = ['avg', 'median', 'min', 'max', 'p95', 'p99'];
            const metricNames = ['MEAN', 'MEDIAN', 'MIN', 'MAX', 'P95', 'P99'];

            for (let i = 0; i < metrics.length; i++) {
                const metric = metrics[i];
                const metricName = metricNames[i];
                const ssdbVal = ssdbStats[op][metric];
                const kvrocksVal = kvrocksStats[op][metric];

                let winner, improvement = '';
                if (ssdbVal === 0 && kvrocksVal === 0) {
                    winner = "Tie";
                } else if (ssdbVal === 0) {
                    winner = "KVRocks+MP";
                } else if (kvrocksVal === 0) {
                    winner = "SSDB";
                } else {
                    winner = ssdbVal < kvrocksVal ? "SSDB" : "KVRocks+MP";
                    const fasterVal = Math.min(ssdbVal, kvrocksVal);
                    const slowerVal = Math.max(ssdbVal, kvrocksVal);
                    improvement = `${((slowerVal - fasterVal) / slowerVal * 100).toFixed(1)}%`;
                }

                console.log(`${metricName.padEnd(12)} ${ssdbVal.toFixed(3).padEnd(12)} ${kvrocksVal.toFixed(3).padEnd(12)} ${improvement.padEnd(15)} ${winner.padEnd(10)}`);
            }

            console.log(`${'ERRORS'.padEnd(12)} ${this.results.ssdb.errors.toString().padEnd(12)} ${this.results.kvrocks_msgpack.errors.toString().padEnd(12)} ${'-'.padEnd(15)} ${'-'.padEnd(10)}`);
        }

        // Storage Comparison
        console.log('\n' + '='.repeat(80));
        console.log('💾 STORAGE FOOTPRINT COMPARISON');
        console.log('='.repeat(80));
        console.log('\n📦 Storage Usage:');
        console.log('-'.repeat(50));
        console.log(`SSDB Storage:     ${(this.results.ssdb.storage / 1024).toFixed(2)} KB`);
        console.log(`KVRocks+MP:       ${(this.results.kvrocks_msgpack.storage / 1024).toFixed(2)} KB`);

        const storageDiff = Math.abs(this.results.ssdb.storage - this.results.kvrocks_msgpack.storage);
        const storagePct = (storageDiff / Math.max(this.results.ssdb.storage, this.results.kvrocks_msgpack.storage) * 100).toFixed(1);
        const storageWinner = this.results.ssdb.storage < this.results.kvrocks_msgpack.storage ? "SSDB" : "KVRocks+MessagePack";
        console.log(`Difference:       ${(storageDiff / 1024).toFixed(2)} KB (${storagePct}%)`);
        console.log(`🏆 ${storageWinner} uses less storage`);

        console.log('\n📦 Compression Ratios:');
        console.log(`  SSDB (built-in):         ${this.results.ssdb.compressionRatio.toFixed(2)}x compression`);
        console.log(`  KVrocks+MessagePack:     ${this.results.kvrocks_msgpack.compressionRatio.toFixed(2)}x compression`);

        // Total Time Comparison
        console.log('\n' + '='.repeat(80));
        console.log(`⏱️  TOTAL TIME COMPARISON FOR ${this.sampleSize.toLocaleString()} RECORDS`);
        console.log('='.repeat(80));
        console.log(`\n⏱️  Total Time for ${this.sampleSize.toLocaleString()} operations:`);
        console.log('-'.repeat(75));
        console.log(`${'Operation'.padEnd(15)} ${'SSDB (sec)'.padEnd(15)} ${'KVRocks+MP (sec)'.padEnd(18)} ${'Difference'.padEnd(18)} ${'Winner'.padEnd(10)}`);
        console.log('-'.repeat(75));

        const ops = ['set', 'get'];
        for (const op of ops) {
            const ssdbTime = this.results.ssdb.totalTime[op];
            const kvrocksTime = this.results.kvrocks_msgpack.totalTime[op];
            const timeDiff = Math.abs(ssdbTime - kvrocksTime);
            const percentage = (timeDiff / Math.max(ssdbTime, kvrocksTime) * 100).toFixed(1);
            const winner = ssdbTime < kvrocksTime ? "SSDB" : "KVRocks+MP";
            const difference = `${(timeDiff / 1000).toFixed(2)}s (${percentage}%)`;

            console.log(`${op.toUpperCase().padEnd(15)} ${(ssdbTime / 1000).toFixed(2).padEnd(15)} ${(kvrocksTime / 1000).toFixed(18)} ${difference.padEnd(18)} ${winner.padEnd(10)}`);
        }

        // Resource Utilization
        console.log('\n' + '='.repeat(80));
        console.log('📊 RESOURCE UTILIZATION');
        console.log('='.repeat(80));

        for (const db of ['ssdb', 'kvrocks_msgpack']) {
            const metrics = this.resourceMetrics[db];
            if (metrics.cpu.length > 0) {
                const avgCpu = metrics.cpu.reduce((a, b) => a + b, 0) / metrics.cpu.length;
                const maxCpu = Math.max(...metrics.cpu);
                const avgMemory = metrics.memory.reduce((a, b) => a + b, 0) / metrics.memory.length;
                const maxMemory = Math.max(...metrics.memory);

                const displayName = db === 'ssdb' ? 'SSDB' : 'KVROCKS+MESSAGEPACK';
                console.log(`\n🔧 ${displayName} Resource Usage:`);
                console.log(`  CPU: Avg=${avgCpu.toFixed(0)}μs, Peak=${maxCpu.toFixed(0)}μs`);
                console.log(`  Memory: Avg=${avgMemory.toFixed(1)}MB, Peak=${maxMemory.toFixed(1)}MB`);
            }
        }

        // Overall Summary
        console.log('\n' + '='.repeat(80));
        console.log('🏁 OVERALL PERFORMANCE SUMMARY');
        console.log('='.repeat(80));

        const avgOps = ['set', 'get'];
        let ssdbAvg = 0;
        let kvrocksAvg = 0;
        let totalOps = 0;

        for (const op of avgOps) {
            const ssdbOps = this.results.ssdb[op].length;
            const kvrocksOps = this.results.kvrocks_msgpack[op].length;

            if (ssdbOps > 0) {
                const ssdbMean = ssdbStats[op].avg;
                ssdbAvg += ssdbMean * ssdbOps;
                totalOps += ssdbOps;
            }

            if (kvrocksOps > 0) {
                const kvrocksMean = kvrocksStats[op].avg;
                kvrocksAvg += kvrocksMean * kvrocksOps;
            }
        }

        if (totalOps > 0) {
            ssdbAvg /= totalOps;
            kvrocksAvg /= totalOps;

            console.log(`\n📈 Performance Summary:`);
            console.log(`  Dataset Size:              ${this.sampleSize.toLocaleString()} documents`);
            console.log(`  SSDB Average:              ${ssdbAvg.toFixed(3)} ms`);
            console.log(`  KVRocks+MessagePack Avg:   ${kvrocksAvg.toFixed(3)} ms`);

            if (ssdbAvg < kvrocksAvg) {
                const improvement = ((kvrocksAvg - ssdbAvg) / kvrocksAvg) * 100;
                console.log(`  🏆 SSDB is ${improvement.toFixed(1)}% faster overall`);
            } else {
                const improvement = ((ssdbAvg - kvrocksAvg) / ssdbAvg) * 100;
                console.log(`  🏆 KVRocks+MessagePack is ${improvement.toFixed(1)}% faster overall`);
            }

            // Throughput calculation
            const ssdbThroughput = 1000 / ssdbAvg;
            const kvrocksThroughput = 1000 / kvrocksAvg;

            console.log(`\n⚡ Throughput (ops/sec):`);
            console.log(`  SSDB:                ${ssdbThroughput.toFixed(0)} ops/sec`);
            console.log(`  KVRocks+MessagePack: ${kvrocksThroughput.toFixed(0)} ops/sec`);
        }

        // Compression overhead
        const compressionOverhead = this.calculateStats(this.results.kvrocks_msgpack.compressionOverhead);
        console.log(`\n⚡ MessagePack compression overhead: ${compressionOverhead.avg.toFixed(3)}ms avg`);

        // Generate and save detailed report
        const report = this.generateComparativeReport();
        fs.writeFileSync('kvrocks_msgpack_vs_ssdb_report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed report saved to: kvrocks_msgpack_vs_ssdb_report.json');

        return report;
    }

    async runBenchmark() {
        console.log('🚀 Starting KVrocks+MessagePack vs SSDB Benchmark');
        console.log(`📊 Sample size: ${this.sampleSize.toLocaleString()} operations`);

        try {
            // Connect to databases
            const ssdbConnected = await this.connectSSDB();
            const kvrocksConnected = await this.connectKVRocks();

            if (!ssdbConnected || !kvrocksConnected) {
                throw new Error('Failed to connect to one or both databases');
            }

            // Run benchmarks
            await this.benchmarkSSDBOperations();
            await this.benchmarkKVrocksMessagePackOperations();

            // Generate results
            const report = await this.printDetailedResults();

            return report;
        } catch (error) {
            console.error('❌ Benchmark failed:', error.message);
            throw error;
        } finally {
            // Cleanup connections
            if (this.ssdbClient) {
                try {
                    await this.ssdbClient.disconnect();
                } catch (error) {
                    console.error('Error disconnecting from SSDB:', error.message);
                }
            }
            if (this.kvrocksClient) {
                try {
                    await this.kvrocksClient.disconnect();
                } catch (error) {
                    console.error('Error disconnecting from KVrocks:', error.message);
                }
            }
        }
    }
}

// SSDB Client Implementation
class SSDBClient {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.socket = null;
        this.connected = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(this.port, this.host, () => {
                this.connected = true;
                resolve();
            });

            this.socket.on('error', (error) => {
                this.connected = false;
                reject(error);
            });

            this.socket.on('close', () => {
                this.connected = false;
            });
        });
    }

    async sendCommand(command, ...args) {
        if (!this.connected) {
            throw new Error('Not connected to SSDB');
        }

        return new Promise((resolve, reject) => {
            const parts = [command, ...args];
            let packet = '';

            for (const part of parts) {
                const str = String(part);
                packet += str.length + '\n' + str + '\n';
            }
            packet += '\n';

            this.socket.write(packet);

            let response = '';
            const onData = (data) => {
                response += data.toString();

                // Parse SSDB protocol response
                const lines = response.split('\n');

                // Check if we have a complete response (ends with double newline)
                if (response.indexOf('\n\n') !== -1) {
                    this.socket.removeListener('data', onData);

                    // SSDB protocol: first line is length, second line is status
                    if (lines.length >= 2) {
                        const status = lines[1];
                        if (status === 'ok') {
                            // For successful response, return the value (if any)
                            resolve(lines.length > 3 ? lines[3] : null);
                        } else if (status === 'not_found') {
                            resolve(null);
                        } else {
                            reject(new Error(`SSDB error: ${status}`));
                        }
                    } else {
                        reject(new Error('Invalid SSDB response'));
                    }
                }
            };

            this.socket.on('data', onData);

            // Add timeout
            setTimeout(() => {
                this.socket.removeListener('data', onData);
                reject(new Error('SSDB command timeout'));
            }, 10000);
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

    async info() {
        return this.sendCommand('info');
    }

    async disconnect() {
        if (this.socket) {
            this.socket.end();
            this.connected = false;
        }
    }
}

// Run the benchmark
async function main() {
    const benchmark = new KVrocksMessagePackVsSSDBBenchmark(100000);
    try {
        await benchmark.runBenchmark();
    } catch (error) {
        console.error('Benchmark failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = KVrocksMessagePackVsSSDBBenchmark;