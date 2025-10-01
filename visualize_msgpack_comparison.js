const fs = require('fs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

class KVrocksMessagePackVsSSDBVisualizer {
    constructor() {
        this.width = 1200;
        this.height = 800;
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: this.width,
            height: this.height,
            backgroundColour: 'white',
            chartCallback: (ChartJS) => {
                ChartJS.defaults.font.size = 14;
                ChartJS.defaults.font.family = 'Arial, sans-serif';
            }
        });
    }

    loadBenchmarkResults() {
        try {
            const data = fs.readFileSync('kvrocks_msgpack_vs_ssdb_report.json', 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading benchmark results:', error.message);
            return null;
        }
    }

    async createPerformanceChart(results) {
        const ssdb = results.performance.ssdb;
        const kvrocks = results.performance.kvrocks_msgpack;

        const configuration = {
            type: 'bar',
            data: {
                labels: ['SET Operations', 'GET Operations', 'DELETE Operations'],
                datasets: [
                    {
                        label: 'SSDB (built-in compression)',
                        data: [ssdb.set.avg, ssdb.get.avg, ssdb.del.avg],
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2
                    },
                    {
                        label: 'KVrocks + MessagePack',
                        data: [kvrocks.set.avg, kvrocks.get.avg, kvrocks.del.avg],
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Comparison: KVrocks+MessagePack vs SSDB',
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Average Response Time (ms)',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Operation Type',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        };

        const buffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('kvrocks_msgpack_vs_ssdb_performance.png', buffer);
        console.log('✅ Performance chart saved as: kvrocks_msgpack_vs_ssdb_performance.png');
    }

    async createCompressionChart(results) {
        const ssdb = results.storage.ssdb;
        const kvrocks = results.storage.kvrocks_msgpack;

        const configuration = {
            type: 'bar',
            data: {
                labels: ['Compression Ratio', 'Storage Efficiency'],
                datasets: [
                    {
                        label: 'SSDB (built-in compression)',
                        data: [ssdb.compressionRatio, ssdb.compressionRatio],
                        backgroundColor: 'rgba(255, 159, 64, 0.7)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 2
                    },
                    {
                        label: 'KVrocks + MessagePack',
                        data: [kvrocks.compressionRatio, kvrocks.compressionRatio],
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Storage Efficiency: Compression Ratio Comparison',
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Compression Ratio (x)',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Metric',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        };

        const buffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('kvrocks_msgpack_vs_ssdb_compression.png', buffer);
        console.log('✅ Compression chart saved as: kvrocks_msgpack_vs_ssdb_compression.png');
    }

    async createDataSizeChart(results) {
        const ssdb = results.storage.ssdb;
        const kvrocks = results.storage.kvrocks_msgpack;

        const configuration = {
            type: 'bar',
            data: {
                labels: ['Original Data', 'SSDB Compressed', 'KVrocks+MessagePack'],
                datasets: [
                    {
                        label: 'Data Size (MB)',
                        data: [
                            ssdb.originalDataSize / (1024 * 1024),
                            ssdb.compressedDataSize / (1024 * 1024),
                            kvrocks.compressedDataSize / (1024 * 1024)
                        ],
                        backgroundColor: [
                            'rgba(153, 102, 255, 0.7)',
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(54, 162, 235, 0.7)'
                        ],
                        borderColor: [
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)'
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
                        text: 'Data Size Comparison: Original vs Compressed',
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Data Size (MB)',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Data Type',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        };

        const buffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('kvrocks_msgpack_vs_ssdb_data_sizes.png', buffer);
        console.log('✅ Data size chart saved as: kvrocks_msgpack_vs_ssdb_data_sizes.png');
    }

    async createOverheadChart(results) {
        const kvrocks = results.performance.kvrocks_msgpack;
        
        const configuration = {
            type: 'line',
            data: {
                labels: ['Compression', 'SET', 'GET', 'DELETE'],
                datasets: [
                    {
                        label: 'KVrocks+MessagePack Overhead (ms)',
                        data: [
                            kvrocks.compressionOverhead.avg,
                            kvrocks.set.avg,
                            kvrocks.get.avg,
                            kvrocks.del.avg
                        ],
                        backgroundColor: 'rgba(255, 206, 86, 0.7)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'KVrocks+MessagePack: Compression & Operation Overhead',
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Time (ms)',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Operation Type',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        };

        const buffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('kvrocks_msgpack_overhead.png', buffer);
        console.log('✅ Overhead chart saved as: kvrocks_msgpack_overhead.png');
    }

    generateSummaryReport(results) {
        const report = `
# KVrocks+MessagePack vs SSDB Benchmark Report

## Executive Summary
- **Sample Size**: ${results.sampleSize.toLocaleString()} operations
- **Benchmark Date**: ${new Date(results.timestamp).toLocaleString()}
- **Comparison**: ${results.comparison}

## Performance Winner: ${results.analysis.performanceWinner}
## Storage Efficiency Winner: ${results.analysis.storageWinner}

## Overall Recommendation
${results.analysis.overallRecommendation}

## Key Findings
${results.analysis.keyFindings.map(finding => `- ${finding}`).join('\n')}

## Detailed Performance Metrics

### SSDB (Built-in Compression)
- **SET Operations**: ${results.performance.ssdb.set.avg.toFixed(2)}ms avg
- **GET Operations**: ${results.performance.ssdb.get.avg.toFixed(2)}ms avg
- **DELETE Operations**: ${results.performance.ssdb.del.avg.toFixed(2)}ms avg
- **Compression Ratio**: ${results.storage.ssdb.compressionRatio.toFixed(2)}x
- **Errors**: ${results.performance.ssdb.errors}

### KVrocks + MessagePack
- **SET Operations**: ${results.performance.kvrocks_msgpack.set.avg.toFixed(2)}ms avg
- **GET Operations**: ${results.performance.kvrocks_msgpack.get.avg.toFixed(2)}ms avg
- **DELETE Operations**: ${results.performance.kvrocks_msgpack.del.avg.toFixed(2)}ms avg
- **Compression Ratio**: ${results.storage.kvrocks_msgpack.compressionRatio.toFixed(2)}x
- **Compression Overhead**: ${results.performance.kvrocks_msgpack.compressionOverhead.avg.toFixed(3)}ms avg
- **Errors**: ${results.performance.kvrocks_msgpack.errors}

## Storage Efficiency Analysis

### Data Size Breakdown
- **Original Data**: ${(results.storage.ssdb.originalDataSize / (1024 * 1024)).toFixed(2)} MB
- **SSDB Compressed**: ${(results.storage.ssdb.compressedDataSize / (1024 * 1024)).toFixed(2)} MB
- **KVrocks+MessagePack**: ${(results.storage.kvrocks_msgpack.compressedDataSize / (1024 * 1024)).toFixed(2)} MB

### Space Savings
- **SSDB**: ${((1 - results.storage.ssdb.compressedDataSize / results.storage.ssdb.originalDataSize) * 100).toFixed(1)}% space saved
- **KVrocks+MessagePack**: ${((1 - results.storage.kvrocks_msgpack.compressedDataSize / results.storage.kvrocks_msgpack.originalDataSize) * 100).toFixed(1)}% space saved

## Charts Generated
- Performance comparison chart: kvrocks_msgpack_vs_ssdb_performance.png
- Compression ratio chart: kvrocks_msgpack_vs_ssdb_compression.png
- Data size comparison: kvrocks_msgpack_vs_ssdb_data_sizes.png
- Overhead analysis: kvrocks_msgpack_overhead.png

---
*Generated by KVrocks+MessagePack vs SSDB Benchmark Tool*
        `;

        fs.writeFileSync('BENCHMARK_SUMMARY.md', report);
        console.log('✅ Summary report saved as: BENCHMARK_SUMMARY.md');
    }

    async generateAllVisualizations() {
        console.log('📊 Generating KVrocks+MessagePack vs SSDB visualizations...');
        
        const results = this.loadBenchmarkResults();
        if (!results) {
            console.error('❌ Could not load benchmark results. Please run the benchmark first.');
            return;
        }

        try {
            await this.createPerformanceChart(results);
            await this.createCompressionChart(results);
            await this.createDataSizeChart(results);
            await this.createOverheadChart(results);
            this.generateSummaryReport(results);

            console.log('\n🎉 All visualizations generated successfully!');
            console.log('\nGenerated files:');
            console.log('- kvrocks_msgpack_vs_ssdb_performance.png');
            console.log('- kvrocks_msgpack_vs_ssdb_compression.png');
            console.log('- kvrocks_msgpack_vs_ssdb_data_sizes.png');
            console.log('- kvrocks_msgpack_overhead.png');
            console.log('- BENCHMARK_SUMMARY.md');
        } catch (error) {
            console.error('❌ Error generating visualizations:', error.message);
        }
    }
}

// Run the visualization generator
async function main() {
    const visualizer = new KVrocksMessagePackVsSSDBVisualizer();
    await visualizer.generateAllVisualizations();
}

if (require.main === module) {
    main();
}

module.exports = KVrocksMessagePackVsSSDBVisualizer;