# SSDB vs KVRocks Benchmarking Tool

A comprehensive benchmarking tool to compare performance between SSDB and KVRocks databases with 1000 sample operations.

## Prerequisites

- Python 3.6+
- SSDB server running on port 8890 (as specified)
- KVRocks server running on port 6379 (default Redis port)

## Installation

1. Install required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Ensure your SSDB server is running on port 8890
2. Ensure your KVRocks server is running on port 6379 (or modify the script for different port)
3. Run the benchmark:

```bash
python benchmark.py
```

## What the Benchmark Tests

The tool performs 1000 operations of each type:
- **SET operations**: Writing key-value pairs
- **GET operations**: Reading existing keys
- **DELETE operations**: Removing keys

## Metrics Collected

For each operation type, the tool measures:
- **Mean latency**: Average response time
- **Median latency**: 50th percentile response time
- **Min/Max latency**: Fastest and slowest operations
- **P95/P99**: 95th and 99th percentile response times
- **Standard deviation**: Consistency of response times
- **Error count**: Number of failed operations

## Output

The benchmark generates:
1. **Console output**: Real-time results with formatted tables
2. **JSON file**: Detailed results saved to `benchmark_results.json`

## Sample Output

```
🔸 SET Operation Results:
------------------------------------------------------------
Metric          SSDB            KVRocks         Winner
------------------------------------------------------------
MEAN            2.341           3.125           SSDB
MEDIAN          2.100           2.890           SSDB
MIN             0.950           1.200           SSDB
MAX             15.600          18.300          SSDB
P95             4.200           5.100           SSDB
P99             7.800           9.200           SSDB
```

## Customization

You can modify the benchmark parameters by editing the script:

- `sample_size`: Change the number of operations (default: 1000)
- SSDB port: Modify the `connect_ssdb()` call
- KVRocks port: Modify the `connect_kvrocks()` call
- Test data size: Adjust the value generation in `generate_test_data()`

## Error Handling

The tool gracefully handles:
- Database connection failures
- Individual operation failures
- Missing database servers (runs partial benchmarks)