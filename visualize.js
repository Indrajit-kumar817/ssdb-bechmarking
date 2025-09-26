const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');

class BenchmarkVisualizer {
    constructor() {
        this.width = 1200;
        this.height = 800;
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: this.width,
            height: this.height,
            backgroundColour: 'white'
        });
    }

    loadBenchmarkResults() {
        try {
            const data = fs.readFileSync('benchmark_results.json', 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading benchmark results:', error);
            return null;
        }
    }

    async createLatencyComparisonChart(results) {
        const operations = ['set', 'get', 'del'];
        const metrics = ['mean', 'median', 'p95', 'p99'];

        const datasets = [];
        const colors = {
            ssdb: {
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgb(255, 99, 132)'
            },
            kvrocks: {
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgb(54, 162, 235)'
            }
        };

        // Create datasets for each database
        ['ssdb', 'kvrocks'].forEach(db => {
            const data = [];
            operations.forEach(op => {
                metrics.forEach(metric => {
                    data.push(results.statistics[db][op][metric]);
                });
            });

            datasets.push({
                label: db.toUpperCase(),
                data: data,
                backgroundColor: colors[db].backgroundColor,
                borderColor: colors[db].borderColor,
                borderWidth: 2
            });
        });

        // Create labels
        const labels = [];
        operations.forEach(op => {
            metrics.forEach(metric => {
                labels.push(`${op.toUpperCase()} - ${metric.toUpperCase()}`);
            });
        });

        const configuration = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'SSDB vs KVRocks - Latency Comparison (ms)',
                        font: {
                            size: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (milliseconds)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Operations & Metrics'
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('latency_comparison.png', imageBuffer);
        console.log('✓ Latency comparison chart saved as latency_comparison.png');
        return 'latency_comparison.png';
    }

    async createOperationChart(results) {
        const operations = ['set', 'get', 'del'];

        const ssdbData = operations.map(op => results.statistics.ssdb[op].mean);
        const kvrocksData = operations.map(op => results.statistics.kvrocks[op].mean);

        const configuration = {
            type: 'bar',
            data: {
                labels: operations.map(op => op.toUpperCase()),
                datasets: [
                    {
                        label: 'SSDB',
                        data: ssdbData,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 2
                    },
                    {
                        label: 'KVRocks',
                        data: kvrocksData,
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgb(54, 162, 235)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Average Latency by Operation Type (ms)',
                        font: {
                            size: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Average Latency (milliseconds)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Operation Type'
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('operation_comparison.png', imageBuffer);
        console.log('✓ Operation comparison chart saved as operation_comparison.png');
        return 'operation_comparison.png';
    }

    async createPercentileChart(results) {
        const operations = ['set', 'get', 'del'];
        const percentiles = ['p95', 'p99'];

        const datasets = [];
        const colors = {
            ssdb: {
                p95: 'rgba(255, 99, 132, 0.8)',
                p99: 'rgba(255, 99, 132, 0.5)'
            },
            kvrocks: {
                p95: 'rgba(54, 162, 235, 0.8)',
                p99: 'rgba(54, 162, 235, 0.5)'
            }
        };

        ['ssdb', 'kvrocks'].forEach(db => {
            percentiles.forEach(percentile => {
                const data = operations.map(op => results.statistics[db][op][percentile]);

                datasets.push({
                    label: `${db.toUpperCase()} ${percentile.toUpperCase()}`,
                    data: data,
                    backgroundColor: colors[db][percentile],
                    borderColor: colors[db][percentile].replace('0.8', '1').replace('0.5', '1'),
                    borderWidth: 2
                });
            });
        });

        const configuration = {
            type: 'bar',
            data: {
                labels: operations.map(op => op.toUpperCase()),
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '95th and 99th Percentile Latency Comparison (ms)',
                        font: {
                            size: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (milliseconds)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Operation Type'
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('percentile_comparison.png', imageBuffer);
        console.log('✓ Percentile comparison chart saved as percentile_comparison.png');
        return 'percentile_comparison.png';
    }

    async createSpeedupChart(results) {
        const operations = ['set', 'get', 'del'];

        const speedupData = operations.map(op => {
            const ssdbLatency = results.statistics.ssdb[op].mean;
            const kvrocksLatency = results.statistics.kvrocks[op].mean;
            return ssdbLatency / kvrocksLatency; // How many times faster KVRocks is
        });

        const configuration = {
            type: 'bar',
            data: {
                labels: operations.map(op => op.toUpperCase()),
                datasets: [
                    {
                        label: 'KVRocks Speedup (x times faster)',
                        data: speedupData,
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(255, 206, 86, 0.8)',
                            'rgba(153, 102, 255, 0.8)'
                        ],
                        borderColor: [
                            'rgb(75, 192, 192)',
                            'rgb(255, 206, 86)',
                            'rgb(153, 102, 255)'
                        ],
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'KVRocks Performance Advantage (Times Faster than SSDB)',
                        font: {
                            size: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Speed Multiplier (x times faster)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Operation Type'
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('speedup_comparison.png', imageBuffer);
        console.log('✓ Speedup comparison chart saved as speedup_comparison.png');
        return 'speedup_comparison.png';
    }

    async generateAllCharts() {
        console.log('📊 Generating benchmark visualization charts...\n');

        const results = this.loadBenchmarkResults();
        if (!results) {
            console.error('Could not load benchmark results. Make sure benchmark_results.json exists.');
            return;
        }

        const charts = [];

        try {
            // Generate all charts
            charts.push(await this.createLatencyComparisonChart(results));
            charts.push(await this.createOperationChart(results));
            charts.push(await this.createPercentileChart(results));
            charts.push(await this.createSpeedupChart(results));

            console.log('\n✅ All charts generated successfully!');
            console.log('\nGenerated files:');
            charts.forEach(chart => {
                console.log(`  📈 ${chart}`);
            });

            // Display summary
            console.log('\n📊 BENCHMARK SUMMARY FROM CHARTS:');
            console.log('=====================================');
            const operations = ['set', 'get', 'del'];
            operations.forEach(op => {
                const ssdb = results.statistics.ssdb[op].mean;
                const kvrocks = results.statistics.kvrocks[op].mean;
                const speedup = (ssdb / kvrocks).toFixed(1);
                console.log(`${op.toUpperCase()}: KVRocks is ${speedup}x faster (${ssdb.toFixed(3)}ms vs ${kvrocks.toFixed(3)}ms)`);
            });

        } catch (error) {
            console.error('Error generating charts:', error);
        }
    }
}

async function main() {
    const visualizer = new BenchmarkVisualizer();
    await visualizer.generateAllCharts();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = BenchmarkVisualizer;