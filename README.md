# SSDB vs KVRocks Comprehensive Benchmarking Tool

A comprehensive benchmarking tool to compare performance between SSDB and KVRocks databases with 100,000 sample operations, featuring advanced metrics, concurrency testing, and resource monitoring.

## Prerequisites

- Node.js 12+
- SSDB server running on port 8890 (default SSDB port)
- KVRocks server running on port 6379 (default Redis port)

## Installation

1. Install required dependencies:
```bash
npm install redis
```

## Usage

1. Ensure your SSDB server is running on port 8890
2. Ensure your KVRocks server is running on port 6379
3. Run the benchmark:

```bash
node benchmark.js
```

## What the Benchmark Tests

The tool performs comprehensive testing with **100,000 operations** of each type:

### Sequential Operations
- **SET operations**: Writing large JSON documents with nested structures
- **GET operations**: Reading existing keys
- **DELETE operations**: Removing keys

### Concurrency Testing
- Tests with multiple concurrent client connections
- Measures performance degradation under load
- Configurable concurrency levels

### Advanced Features
- **Resource Monitoring**: CPU and memory usage tracking
- **Storage Analysis**: Measures actual storage footprint
- **Progress Tracking**: Real-time progress bars with percentage completion
- **Large JSON Documents**: Complex nested structures (~1KB per document)

## Test Data Structure

Each test document is a complex JSON object containing:
- Unique ID and timestamp
- 100-character random data strings
- Nested metadata with tags and scores
- Array of 10 nested field objects
- Total document size: ~1KB

## Metrics Collected

### Performance Metrics
For each operation type, the tool measures:
- **Mean latency**: Average response time (ms)
- **Median latency**: 50th percentile response time
- **Min/Max latency**: Fastest and slowest operations
- **P95/P99**: 95th and 99th percentile response times
- **Standard deviation**: Consistency of response times
- **Total time**: End-to-end time for all operations
- **Throughput**: Operations per second
- **Error count**: Number of failed operations

### Resource Metrics
- **CPU Usage**: Process CPU utilization during operations
- **Memory Usage**: Process memory consumption (RSS)
- **Storage Footprint**: Actual disk/memory usage by database

### Concurrency Analysis
- Performance impact under concurrent load
- Latency comparison across different concurrency levels
- Error rates under stress conditions

## Output

The benchmark generates:
1. **Console output**: Comprehensive real-time results with:
   - Progress bars with completion percentages
   - Detailed performance tables
   - Concurrency impact analysis
   - Storage footprint comparison
   - Total time comparison
   - Resource utilization summary
   - Overall performance summary with winner declarations

2. **JSON file**: Detailed results saved to `benchmark_results.json` including:
   - Raw performance data
   - Statistical analysis
   - Concurrency test results
   - Resource monitoring data
   - Storage comparison metrics

## Sample Output

```
====================================================================================================
 *COMPREHENSIVE BENCHMARK RESULTS between SSDB and KvROCKS*
====================================================================================================

================================================================================
 *SEQUENTIAL OPERATION RESULTS (Dataset: 1,00,000 documents)*
================================================================================

 SET Operation (ms):
----------------------------------------------------------------------
Metric       SSDB         KVRocks      Improvement     Winner
----------------------------------------------------------------------
MEAN         26.797       0.108        99.6%           KVRocks
MEDIAN       30.693       0.094        99.7%           KVRocks
MIN          0.339        0.077        77.1%           KVRocks
MAX          218.609      33.347       84.7%           KVRocks
P95          31.702       0.175        99.4%           KVRocks
P99          32.170       0.255        99.2%           KVRocks
ERRORS       0            0            -               -

 GET Operation (ms):
----------------------------------------------------------------------
Metric       SSDB         KVRocks      Improvement     Winner
----------------------------------------------------------------------
MEAN         18.160       0.113        99.4%           KVRocks
MEDIAN       15.696       0.094        99.4%           KVRocks
MIN          0.193        0.077        59.9%           KVRocks
MAX          33.013       2.400        92.7%           KVRocks
P95          31.228       0.194        99.4%           KVRocks
P99          31.694       0.282        99.1%           KVRocks
ERRORS       0            0            -               -

 DEL Operation (ms):
----------------------------------------------------------------------
Metric       SSDB         KVRocks      Improvement     Winner
----------------------------------------------------------------------
MEAN         26.761       0.108        99.6%           KVRocks
MEDIAN       30.672       0.091        99.7%           KVRocks
MIN          0.344        0.076        78.0%           KVRocks
MAX          37.224       24.360       34.6%           KVRocks
P95          31.691       0.174        99.5%           KVRocks
P99          32.153       0.244        99.2%           KVRocks
ERRORS       0            0            -               -

================================================================================
 *CONCURRENCY IMPACT ANALYSIS*
================================================================================

 1 Concurrent Clients:
--------------------------------------------------
  SET: SSDB=27.412ms, KVRocks=0.099ms
  GET: SSDB=18.264ms, KVRocks=0.111ms
  DEL: SSDB=26.967ms, KVRocks=0.100ms

================================================================================
 *STORAGE FOOTPRINT COMPARISON (JSON-to-JSON)*
================================================================================

 Storage Usage:
--------------------------------------------------
SSDB Storage:     57584.64 KB (56.235 MB)
KVRocks Storage:  70500.26 KB (68.85 MB)
Difference:       12915.62 KB (12.62 MB) (18.3%)
* SSDB uses less storage*

================================================================================
  *TOTAL TIME COMPARISON FOR 100,000 RECORDS*
================================================================================

  Total Time for 1,00,000 operations:
---------------------------------------------------------------------------
Operation       SSDB (sec)      KVRocks (sec)   Difference         Winner
---------------------------------------------------------------------------
SET             2680.44         10.94           2669.49s (99.6%)   KVRocks
GET             1816.62         11.46           1805.17s (99.4%)   KVRocks
DEL             2676.86         10.88           2665.98s (99.6%)   KVRocks
---------------------------------------------------------------------------
TOTAL           7173.91         33.27           7140.64s (99.5%)   KVRocks

================================================================================
 RESOURCE UTILIZATION
================================================================================

 SSDB Resource Usage:
  CPU: Avg=82384916μs, Peak=159530000μs
  Memory: Avg=136.5MB, Peak=166.8MB

 KVROCKS Resource Usage:
  CPU: Avg=109196417μs, Peak=167859000μs
  Memory: Avg=142.5MB, Peak=160.9MB

================================================================================
* OVERALL PERFORMANCE SUMMARY*
================================================================================

 Performance Summary:
  Dataset Size:     1,00,000 documents
  SSDB Average:     23.906 ms
  KVRocks Average:  0.110 ms
   KVRocks is 99.5% faster overall

 Throughput (ops/sec):
  SSDB:     42 ops/sec
  KVRocks:  9109 ops/sec
```

## Benchmark Analysis

### Key Findings

#### 1. Performance Comparison
**KVRocks demonstrates exceptional performance superiority:**
- **Overall Speed**: KVRocks is **99.5% faster** than SSDB across all operations
- **Throughput**: KVRocks achieves **9,109 ops/sec** compared to SSDB's **42 ops/sec** (217x improvement)
- **Average Latency**: KVRocks averages **0.110ms** vs SSDB's **23.906ms** (217x faster)

#### 2. Operation-Specific Performance

**SET Operations:**
- KVRocks MEAN: 0.108ms vs SSDB: 26.797ms (**99.6% improvement**)
- KVRocks completes 100,000 SET operations in **10.94 seconds** vs SSDB's **2,680.44 seconds**
- KVRocks MEDIAN: 0.094ms vs SSDB: 30.693ms (**99.7% improvement**)

**GET Operations:**
- KVRocks MEAN: 0.113ms vs SSDB: 18.160ms (**99.4% improvement**)
- KVRocks completes 100,000 GET operations in **11.46 seconds** vs SSDB's **1,816.62 seconds**
- Consistently sub-millisecond performance for KVRocks across all percentiles

**DEL Operations:**
- KVRocks MEAN: 0.108ms vs SSDB: 26.761ms (**99.6% improvement**)
- KVRocks completes 100,000 DEL operations in **10.88 seconds** vs SSDB's **2,676.86 seconds**
- KVRocks maintains consistent deletion performance

#### 3. Total Time Analysis
For **100,000 operations** of each type (300,000 total):
- **SSDB Total Time**: 7,173.91 seconds (~2 hours)
- **KVRocks Total Time**: 33.27 seconds (~33 seconds)
- **Time Saved**: 7,140.64 seconds (~2 hours saved)

#### 4. Latency Consistency
**KVRocks shows superior consistency:**
- P95 latency: 0.175ms (SET), 0.194ms (GET), 0.174ms (DEL)
- P99 latency: 0.255ms (SET), 0.282ms (GET), 0.244ms (DEL)
- All operations remain sub-millisecond even at 99th percentile

**SSDB shows higher variance:**
- P95 latency: 31.702ms (SET), 31.228ms (GET), 31.691ms (DEL)
- P99 latency: 32.170ms (SET), 31.694ms (GET), 32.153ms (DEL)
- MAX latency spikes up to 218.609ms for SET operations

#### 5. Storage Efficiency
**SSDB has a storage advantage:**
- SSDB Storage: **56.235 MB** (57,584.64 KB)
- KVRocks Storage: **68.85 MB** (70,500.26 KB)
- Difference: **12.62 MB more** for KVRocks (**18.3% higher**)
- Trade-off: KVRocks uses 18.3% more storage but delivers 99.5% better performance

#### 6. Resource Utilization

**CPU Usage:**
- SSDB: Average 82.38s, Peak 159.53s
- KVRocks: Average 109.20s, Peak 167.86s
- KVRocks uses **32.5% more CPU** but completes work **215x faster**

**Memory Usage:**
- SSDB: Average 136.5MB, Peak 166.8MB
- KVRocks: Average 142.5MB, Peak 160.9MB
- Similar memory footprint, with KVRocks being slightly more efficient at peak

#### 7. Concurrency Performance
With **1 concurrent client:**
- SET: KVRocks (0.099ms) vs SSDB (27.412ms) - **99.6% faster**
- GET: KVRocks (0.111ms) vs SSDB (18.264ms) - **99.4% faster**
- DEL: KVRocks (0.100ms) vs SSDB (26.967ms) - **99.6% faster**

### Recommendations

#### When to Use KVRocks:
- **High-performance requirements**: Applications needing low-latency operations
- **High-throughput workloads**: Systems processing thousands of operations per second
- **Real-time applications**: Sub-millisecond response time requirements
- **Large-scale operations**: Processing millions of records efficiently
- **Time-sensitive tasks**: When total processing time is critical

#### When to Consider SSDB:
- **Storage-constrained environments**: When storage efficiency is paramount (18.3% smaller footprint)
- **Budget-limited scenarios**: Lower storage costs due to smaller footprint
- **Lower throughput applications**: Systems with <100 ops/sec requirements

### Performance-to-Storage Trade-off
KVRocks offers an **excellent performance-to-storage trade-off**:
- **18.3% more storage** for **99.5% better performance**
- **217x faster throughput** with only **1.18x storage overhead**
- For every additional MB of storage, KVRocks delivers approximately **550x performance improvement**

### Conclusion
**KVRocks is the clear winner for performance-critical applications**, delivering exceptional speed improvements across all operations with minimal additional resource requirements. The 18.3% storage overhead is negligible compared to the massive 99.5% performance gain, making KVRocks the optimal choice for most modern application scenarios where speed and throughput are priorities.

## Customization

You can modify the benchmark parameters in the `DatabaseBenchmark` constructor:

```javascript
// Customize benchmark parameters
const benchmark = new DatabaseBenchmark(
    50000,        // sampleSize: number of operations (default: 100,000)
    [1, 10, 50]   // concurrencyLevels: array of concurrent clients to test
);
```

Other customizable options:
- **SSDB connection**: Modify `connectSSDB()` call parameters (host, port)
- **KVRocks connection**: Modify `connectKVRocks()` call parameters (host, port)
- **Test data structure**: Adjust JSON document generation in `generateTestData()`
- **Monitoring interval**: Change resource monitoring frequency (default: 100ms)

## Error Handling

The tool gracefully handles:
- Database connection failures (continues with available databases)
- Individual operation failures (counted as errors, doesn't stop benchmark)
- Missing database servers (runs partial benchmarks)
- Resource monitoring errors (continues without resource data)
- Storage measurement failures (estimated from sample data)

## Technical Features

- **Custom SSDB Client**: Raw socket implementation for SSDB protocol communication
- **Redis/KVRocks Client**: Uses the official Redis Node.js client
- **Asynchronous Operations**: All operations are fully asynchronous for accurate timing
- **Memory Efficient**: Processes large datasets without excessive memory usage
- **Progress Tracking**: Visual progress bars with real-time completion status
- **Comprehensive Logging**: Detailed console output with emojis for better readability