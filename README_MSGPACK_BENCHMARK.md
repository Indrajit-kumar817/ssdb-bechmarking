# KVRocks + MessagePack vs SSDB Benchmark Results

## Overview
This benchmark compares **KVRocks with client-side MessagePack compression** against **SSDB with built-in automatic compression** to evaluate both performance and storage efficiency.

## Test Configuration
- **Dataset Size**: 100,000 documents
- **Data Type**: JSON objects with nested structures
- **KVRocks Strategy**: Client-side MessagePack compression before storage
- **SSDB Strategy**: Built-in automatic compression
- **Operations Tested**: SET and GET (DELETE commented out for faster testing)

---

## 📊 Benchmark Results

### ⚡ Performance Comparison (Sequential Operations)

#### SET Operation (ms)
| Metric | SSDB | KVRocks+MessagePack | Improvement | Winner |
|--------|------|---------------------|-------------|--------|
| **MEAN** | 20.613 | 0.241 | 98.8% | KVRocks+MP |
| **MEDIAN** | 15.938 | 0.207 | 98.7% | KVRocks+MP |
| **MIN** | 0.418 | 0.121 | 71.1% | KVRocks+MP |
| **MAX** | 73.608 | 27.267 | 63.0% | KVRocks+MP |
| **P95** | 31.427 | 0.423 | 98.7% | KVRocks+MP |
| **P99** | 31.966 | 0.601 | 98.1% | KVRocks+MP |
| **ERRORS** | 0 | 0 | - | - |

#### GET Operation (ms)
| Metric | SSDB | KVRocks+MessagePack | Improvement | Winner |
|--------|------|---------------------|-------------|--------|
| **MEAN** | 14.707 | 0.451 | 96.9% | KVRocks+MP |
| **MEDIAN** | 15.452 | 0.370 | 97.6% | KVRocks+MP |
| **MIN** | 0.192 | 0.162 | 15.5% | KVRocks+MP |
| **MAX** | 127.024 | 37.573 | 70.4% | KVRocks+MP |
| **P95** | 31.006 | 0.844 | 97.3% | KVRocks+MP |
| **P99** | 31.604 | 1.431 | 95.5% | KVRocks+MP |
| **ERRORS** | 0 | 0 | - | - |

---

### 💾 Storage Efficiency Comparison

#### Storage Usage
| Database | Storage Size | Notes |
|----------|--------------|-------|
| **SSDB** | 58,832.53 KB (57.45 MB) | Built-in compression |
| **KVRocks+MessagePack** | 47,778.26 KB (46.66 MB) | Client-side MessagePack |
| **Difference** | 11,054.27 KB (18.8%) | KVRocks+MP uses less |

#### Compression Ratios
- **SSDB (built-in)**: 0.98x compression (actually expanded)
- **KVRocks+MessagePack**: 1.27x compression (21% reduction)

**Winner**: 🏆 **KVRocks+MessagePack** uses **18.8% less storage**

---

### ⏱️ Total Time Comparison (100,000 records)

| Operation | SSDB (sec) | KVRocks+MP (sec) | Difference | Winner |
|-----------|------------|------------------|------------|--------|
| **SET** | 2,061.49 | 24.18 | 2,037.32s (98.8%) | KVRocks+MP |
| **GET** | 1,470.91 | 45.35 | 1,425.56s (96.9%) | KVRocks+MP |
| **TOTAL** | 3,532.40 | 69.53 | 3,462.87s (98.0%) | KVRocks+MP |

---

### 📊 Resource Utilization

#### SSDB Resource Usage
- **CPU**: Avg=46,213,341μs, Peak=93,155,000μs
- **Memory**: Avg=146.7MB, Peak=170.3MB

#### KVRocks+MessagePack Resource Usage
- **CPU**: Avg=133,810,671μs, Peak=160,249,000μs
- **Memory**: Avg=687.7MB, Peak=691.0MB

**Note**: KVRocks+MessagePack uses more CPU and memory due to:
1. MessagePack compression/decompression overhead
2. Storing compressed binary data in Node.js memory during benchmark
3. Higher throughput (processing more operations per second)

---

### 🏁 Overall Performance Summary

#### Performance Metrics
- **Dataset Size**: 100,000 documents
- **SSDB Average Latency**: 17.660 ms
- **KVRocks+MessagePack Average Latency**: 0.346 ms
- **Performance Improvement**: **98.0% faster** 🏆

#### Throughput (ops/sec)
- **SSDB**: 57 ops/sec
- **KVRocks+MessagePack**: 2,893 ops/sec
- **Throughput Improvement**: **50x faster**

#### MessagePack Overhead
- **Compression Overhead**: 0.084ms average (negligible)

---

## 🎯 Key Findings

### 1. **Performance Winner: KVRocks + MessagePack**
- **98.0% faster** overall performance
- **50x higher throughput** (2,893 vs 57 ops/sec)
- MessagePack compression adds negligible overhead (0.084ms)

### 2. **Storage Winner: KVRocks + MessagePack**
- **18.8% less storage** than SSDB
- **1.27x compression ratio** vs SSDB's 0.98x (which actually expanded data)
- Better compression efficiency for JSON data

### 3. **Resource Trade-offs**
- KVRocks+MessagePack uses **~3x more CPU** due to compression/decompression
- KVRocks+MessagePack uses **~4.7x more memory** due to in-memory compressed data
- This is acceptable given the massive performance gains

---

## 📈 Recommendations

### Use **KVRocks + MessagePack** when:
✅ **Performance is critical** - 98% faster operations
✅ **Storage efficiency matters** - 18.8% less disk space
✅ **High throughput needed** - 50x more ops/sec
✅ **CPU/Memory resources available** - Can handle compression overhead

### Use **SSDB** when:
✅ **Minimal CPU/Memory overhead required**
✅ **Built-in compression preferred** over client-side
✅ **Simpler implementation needed** (no MessagePack handling)

---

## 🚀 Conclusion

**KVRocks with client-side MessagePack compression provides the best of both worlds:**
- ⚡ **Superior Performance**: 98% faster with 50x higher throughput
- 💾 **Better Storage Efficiency**: 18.8% less disk space
- 🔄 **Negligible Compression Overhead**: Only 0.084ms average

**Overall Winner**: 🏆 **KVRocks + MessagePack** - Delivers both exceptional performance AND storage efficiency!

---

## Running the Benchmark

### Prerequisites
1. **SSDB Server** running on `localhost:8890`
2. **KVRocks Server** running on `localhost:6379`
3. **Dependencies**: `npm install`

### Execute Benchmark
```bash
npm run benchmark-msgpack
```

Or directly:
```bash
node kvrocks_msgpack_vs_ssdb_benchmark.js
```

### Configuration
Adjust sample size in `kvrocks_msgpack_vs_ssdb_benchmark.js`:
```javascript
const benchmark = new KVrocksMessagePackVsSSDBBenchmark(100000);
```

---

## 📄 Output Files
- **Detailed Report**: `kvrocks_msgpack_vs_ssdb_report.json`
- **Benchmark Script**: `kvrocks_msgpack_vs_ssdb_benchmark.js`
- **This README**: `README_MSGPACK_BENCHMARK.md`

---

## Understanding the Metrics

### Storage Usage
Measures **disk space** consumed by data:
- SSDB stores JSON as strings
- KVRocks stores MessagePack compressed binary
- Shows compression efficiency

### Resource Usage
Measures **system resources** during benchmark:
- **CPU**: Processing time in microseconds
- **Memory**: RAM consumption in MB
- Shows operational overhead

The benchmark helps you make an informed decision about whether KVRocks with MessagePack compression can deliver both performance benefits and storage efficiency for your use case.
