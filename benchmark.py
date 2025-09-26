#!/usr/bin/env python3

import redis
import ssdb
import time
import statistics
import random
import string
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import threading

class DatabaseBenchmark:
    def __init__(self, sample_size=1000):
        self.sample_size = sample_size
        self.ssdb_client = None
        self.kvrocks_client = None
        self.results = {
            'ssdb': {'set': [], 'get': [], 'del': [], 'errors': 0},
            'kvrocks': {'set': [], 'get': [], 'del': [], 'errors': 0}
        }

    def connect_ssdb(self, host='localhost', port=8890):
        """Connect to SSDB server"""
        try:
            self.ssdb_client = ssdb.SSDB(host=host, port=port)
            # Test connection
            self.ssdb_client.set('test_connection', 'ok')
            self.ssdb_client.delete('test_connection')
            print(f"✓ Connected to SSDB at {host}:{port}")
            return True
        except Exception as e:
            print(f"✗ Failed to connect to SSDB: {e}")
            return False

    def connect_kvrocks(self, host='localhost', port=6379):
        """Connect to KVRocks server"""
        try:
            self.kvrocks_client = redis.Redis(host=host, port=port, decode_responses=True)
            # Test connection
            self.kvrocks_client.set('test_connection', 'ok')
            self.kvrocks_client.delete('test_connection')
            print(f"✓ Connected to KVRocks at {host}:{port}")
            return True
        except Exception as e:
            print(f"✗ Failed to connect to KVRocks: {e}")
            return False

    def generate_test_data(self):
        """Generate test key-value pairs"""
        data = []
        for i in range(self.sample_size):
            key = f"benchmark_key_{i}"
            value = ''.join(random.choices(string.ascii_letters + string.digits, k=100))
            data.append((key, value))
        return data

    def benchmark_ssdb_operation(self, operation, key, value=None):
        """Benchmark a single SSDB operation"""
        start_time = time.time()
        try:
            if operation == 'set':
                self.ssdb_client.set(key, value)
            elif operation == 'get':
                self.ssdb_client.get(key)
            elif operation == 'del':
                self.ssdb_client.delete(key)

            end_time = time.time()
            return (end_time - start_time) * 1000  # Convert to milliseconds
        except Exception as e:
            self.results['ssdb']['errors'] += 1
            print(f"SSDB {operation} error: {e}")
            return None

    def benchmark_kvrocks_operation(self, operation, key, value=None):
        """Benchmark a single KVRocks operation"""
        start_time = time.time()
        try:
            if operation == 'set':
                self.kvrocks_client.set(key, value)
            elif operation == 'get':
                self.kvrocks_client.get(key)
            elif operation == 'del':
                self.kvrocks_client.delete(key)

            end_time = time.time()
            return (end_time - start_time) * 1000  # Convert to milliseconds
        except Exception as e:
            self.results['kvrocks']['errors'] += 1
            print(f"KVRocks {operation} error: {e}")
            return None

    def run_benchmark(self):
        """Run the complete benchmark suite"""
        print(f"\n🚀 Starting benchmark with {self.sample_size} operations per test...\n")

        # Generate test data
        test_data = self.generate_test_data()

        # Benchmark SET operations
        print("📝 Benchmarking SET operations...")
        self.benchmark_set_operations(test_data)

        # Benchmark GET operations
        print("📖 Benchmarking GET operations...")
        self.benchmark_get_operations(test_data)

        # Benchmark DELETE operations
        print("🗑️  Benchmarking DELETE operations...")
        self.benchmark_del_operations(test_data)

        # Generate and display results
        self.display_results()

    def benchmark_set_operations(self, test_data):
        """Benchmark SET operations for both databases"""
        # SSDB SET benchmark
        if self.ssdb_client:
            for key, value in test_data:
                latency = self.benchmark_ssdb_operation('set', key, value)
                if latency is not None:
                    self.results['ssdb']['set'].append(latency)

        # KVRocks SET benchmark
        if self.kvrocks_client:
            for key, value in test_data:
                latency = self.benchmark_kvrocks_operation('set', key, value)
                if latency is not None:
                    self.results['kvrocks']['set'].append(latency)

    def benchmark_get_operations(self, test_data):
        """Benchmark GET operations for both databases"""
        # SSDB GET benchmark
        if self.ssdb_client:
            for key, _ in test_data:
                latency = self.benchmark_ssdb_operation('get', key)
                if latency is not None:
                    self.results['ssdb']['get'].append(latency)

        # KVRocks GET benchmark
        if self.kvrocks_client:
            for key, _ in test_data:
                latency = self.benchmark_kvrocks_operation('get', key)
                if latency is not None:
                    self.results['kvrocks']['get'].append(latency)

    def benchmark_del_operations(self, test_data):
        """Benchmark DELETE operations for both databases"""
        # SSDB DELETE benchmark
        if self.ssdb_client:
            for key, _ in test_data:
                latency = self.benchmark_ssdb_operation('del', key)
                if latency is not None:
                    self.results['ssdb']['del'].append(latency)

        # KVRocks DELETE benchmark
        if self.kvrocks_client:
            for key, _ in test_data:
                latency = self.benchmark_kvrocks_operation('del', key)
                if latency is not None:
                    self.results['kvrocks']['del'].append(latency)

    def calculate_stats(self, latencies):
        """Calculate statistics for a list of latencies"""
        if not latencies:
            return {
                'count': 0,
                'mean': 0,
                'median': 0,
                'min': 0,
                'max': 0,
                'std_dev': 0,
                'p95': 0,
                'p99': 0
            }

        return {
            'count': len(latencies),
            'mean': statistics.mean(latencies),
            'median': statistics.median(latencies),
            'min': min(latencies),
            'max': max(latencies),
            'std_dev': statistics.stdev(latencies) if len(latencies) > 1 else 0,
            'p95': self.percentile(latencies, 0.95),
            'p99': self.percentile(latencies, 0.99)
        }

    def percentile(self, data, percentile):
        """Calculate percentile of a dataset"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile)
        return sorted_data[min(index, len(sorted_data) - 1)]

    def display_results(self):
        """Display benchmark results in a formatted table"""
        print("\n" + "="*80)
        print("📊 BENCHMARK RESULTS")
        print("="*80)

        # Calculate statistics for each operation and database
        stats = {}
        for db in ['ssdb', 'kvrocks']:
            stats[db] = {}
            for operation in ['set', 'get', 'del']:
                stats[db][operation] = self.calculate_stats(self.results[db][operation])

        # Display results for each operation
        operations = ['set', 'get', 'del']
        for operation in operations:
            print(f"\n🔸 {operation.upper()} Operation Results:")
            print("-" * 60)

            # Header
            print(f"{'Metric':<15} {'SSDB':<15} {'KVRocks':<15} {'Winner':<15}")
            print("-" * 60)

            metrics = ['mean', 'median', 'min', 'max', 'p95', 'p99']
            for metric in metrics:
                ssdb_val = stats['ssdb'][operation][metric]
                kvrocks_val = stats['kvrocks'][operation][metric]

                # Determine winner (lower latency is better)
                if ssdb_val == 0 and kvrocks_val == 0:
                    winner = "Tie"
                elif ssdb_val == 0:
                    winner = "KVRocks"
                elif kvrocks_val == 0:
                    winner = "SSDB"
                else:
                    winner = "SSDB" if ssdb_val < kvrocks_val else "KVRocks"

                print(f"{metric.upper():<15} {ssdb_val:<15.3f} {kvrocks_val:<15.3f} {winner:<15}")

            # Error counts
            print(f"{'ERRORS':<15} {self.results['ssdb']['errors']:<15} {self.results['kvrocks']['errors']:<15}")

        # Overall summary
        print("\n" + "="*80)
        print("📈 OVERALL PERFORMANCE SUMMARY")
        print("="*80)

        # Calculate average performance across all operations
        ssdb_avg = 0
        kvrocks_avg = 0
        total_ops = 0

        for operation in operations:
            ssdb_ops = len(self.results['ssdb'][operation])
            kvrocks_ops = len(self.results['kvrocks'][operation])

            if ssdb_ops > 0:
                ssdb_avg += statistics.mean(self.results['ssdb'][operation]) * ssdb_ops
                total_ops += ssdb_ops

            if kvrocks_ops > 0:
                kvrocks_avg += statistics.mean(self.results['kvrocks'][operation]) * kvrocks_ops

        if total_ops > 0:
            ssdb_avg /= total_ops
            kvrocks_avg /= total_ops

            print(f"Average latency across all operations:")
            print(f"  SSDB: {ssdb_avg:.3f} ms")
            print(f"  KVRocks: {kvrocks_avg:.3f} ms")

            if ssdb_avg < kvrocks_avg:
                improvement = ((kvrocks_avg - ssdb_avg) / kvrocks_avg) * 100
                print(f"  🏆 SSDB is {improvement:.1f}% faster overall")
            else:
                improvement = ((ssdb_avg - kvrocks_avg) / ssdb_avg) * 100
                print(f"  🏆 KVRocks is {improvement:.1f}% faster overall")

        # Save detailed results to JSON
        self.save_results_to_file(stats)

        print(f"\n✅ Benchmark completed! Results saved to benchmark_results.json")

    def save_results_to_file(self, stats):
        """Save detailed results to a JSON file"""
        detailed_results = {
            'timestamp': datetime.now().isoformat(),
            'sample_size': self.sample_size,
            'statistics': stats,
            'raw_data': self.results
        }

        with open('benchmark_results.json', 'w') as f:
            json.dump(detailed_results, f, indent=2)


def main():
    print("🔥 SSDB vs KVRocks Benchmark Tool")
    print("="*50)

    # Initialize benchmark
    benchmark = DatabaseBenchmark(sample_size=1000)

    # Try to connect to both databases
    ssdb_connected = benchmark.connect_ssdb(port=8890)
    kvrocks_connected = benchmark.connect_kvrocks()

    if not ssdb_connected and not kvrocks_connected:
        print("❌ Could not connect to any database. Please ensure SSDB and/or KVRocks are running.")
        return

    if not ssdb_connected:
        print("⚠️  SSDB not available. Running benchmark for KVRocks only.")

    if not kvrocks_connected:
        print("⚠️  KVRocks not available. Running benchmark for SSDB only.")

    # Run the benchmark
    benchmark.run_benchmark()


if __name__ == "__main__":
    main()