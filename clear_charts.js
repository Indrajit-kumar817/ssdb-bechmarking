const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');

class ClearChartGenerator {
    constructor() {
        this.width = 1400;
        this.height = 900;
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

    async createDirectComparisonChart(results) {
        const operations = ['SET', 'GET', 'DEL'];

        const ssdbData = operations.map(op => results.statistics.ssdb[op.toLowerCase()].mean);
        const kvrocksData = operations.map(op => results.statistics.kvrocks[op.toLowerCase()].mean);

        const configuration = {
            type: 'bar',
            data: {
                labels: operations,
                datasets: [
                    {
                        label: 'SSDB (ms)',
                        data: ssdbData,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 2
                    },
                    {
                        label: 'KVRocks (ms)',
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
                        text: 'SSDB vs KVRocks - Average Response Time Comparison',
                        font: {
                            size: 24,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 16
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (milliseconds)',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Database Operations',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 16
                            }
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('direct_comparison.png', imageBuffer);
        console.log('✓ Direct comparison chart saved as direct_comparison.png');
        return 'direct_comparison.png';
    }

    async createPerformanceGainChart(results) {
        const operations = ['SET', 'GET', 'DEL'];

        const speedupData = operations.map(op => {
            const ssdb = results.statistics.ssdb[op.toLowerCase()].mean;
            const kvrocks = results.statistics.kvrocks[op.toLowerCase()].mean;
            return Math.round((ssdb / kvrocks) * 10) / 10; // Round to 1 decimal
        });

        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1'];

        const configuration = {
            type: 'bar',
            data: {
                labels: operations,
                datasets: [{
                    label: 'Times Faster (KVRocks vs SSDB)',
                    data: speedupData,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'KVRocks Performance Advantage - How Many Times Faster?',
                        font: {
                            size: 24,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 16
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y}x faster than SSDB`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Speed Multiplier (Times Faster)',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 14
                            },
                            callback: function(value) {
                                return value + 'x';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Database Operations',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 16
                            }
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('performance_gain.png', imageBuffer);
        console.log('✓ Performance gain chart saved as performance_gain.png');
        return 'performance_gain.png';
    }

    async createLatencyBreakdownChart(results) {
        const operations = ['SET', 'GET', 'DEL'];
        const metrics = ['Mean', 'Median', 'P95', 'P99'];

        // Create separate datasets for SSDB and KVRocks
        const ssdbDatasets = operations.map((op, index) => {
            const colors = [
                ['#FF6384', '#FF8FA8', '#FFB3C1', '#FFD0DC'],  // Pink shades for SET
                ['#36A2EB', '#5CB3F0', '#80C4F5', '#A3D5FA'],  // Blue shades for GET
                ['#FFCE56', '#FFD76B', '#FFE080', '#FFE995']   // Yellow shades for DEL
            ];

            return {
                label: `SSDB ${op}`,
                data: metrics.map(metric => {
                    const metricKey = metric.toLowerCase().replace('p', 'p');
                    return results.statistics.ssdb[op.toLowerCase()][metricKey];
                }),
                backgroundColor: colors[index],
                borderColor: colors[index][0],
                borderWidth: 2
            };
        });

        const kvrocksDatasets = operations.map((op, index) => {
            const colors = [
                ['#FF6384', '#FF8FA8', '#FFB3C1', '#FFD0DC'],  // Pink shades for SET
                ['#36A2EB', '#5CB3F0', '#80C4F5', '#A3D5FA'],  // Blue shades for GET
                ['#FFCE56', '#FFD76B', '#FFE080', '#FFE995']   // Yellow shades for DEL
            ];

            return {
                label: `KVRocks ${op}`,
                data: metrics.map(metric => {
                    const metricKey = metric.toLowerCase().replace('p', 'p');
                    return results.statistics.kvrocks[op.toLowerCase()][metricKey];
                }),
                backgroundColor: colors[index].map(c => c + '80'), // Add transparency
                borderColor: colors[index][0],
                borderWidth: 2
            };
        });

        const configuration = {
            type: 'bar',
            data: {
                labels: metrics,
                datasets: [...ssdbDatasets, ...kvrocksDatasets]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Detailed Latency Metrics Comparison (All Operations)',
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (milliseconds)',
                            font: {
                                size: 14,
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
                            text: 'Latency Metrics',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('latency_breakdown.png', imageBuffer);
        console.log('✓ Latency breakdown chart saved as latency_breakdown.png');
        return 'latency_breakdown.png';
    }

    async createSummaryDashboard(results) {
        const operations = ['SET', 'GET', 'DEL'];

        // Calculate summary statistics
        let totalSSDBLatency = 0;
        let totalKVRocksLatency = 0;
        let totalOps = 0;

        operations.forEach(op => {
            const ssdbMean = results.statistics.ssdb[op.toLowerCase()].mean;
            const kvrocksMean = results.statistics.kvrocks[op.toLowerCase()].mean;
            const opCount = results.statistics.ssdb[op.toLowerCase()].count;

            totalSSDBLatency += ssdbMean * opCount;
            totalKVRocksLatency += kvrocksMean * opCount;
            totalOps += opCount;
        });

        const avgSSDB = totalSSDBLatency / totalOps;
        const avgKVRocks = totalKVRocksLatency / totalOps;
        const overallSpeedup = avgSSDB / avgKVRocks;
        const improvementPercent = ((avgSSDB - avgKVRocks) / avgSSDB * 100);

        // Create a summary chart with key metrics
        const summaryData = {
            'Avg SSDB (ms)': avgSSDB,
            'Avg KVRocks (ms)': avgKVRocks,
            'Speed Advantage': overallSpeedup,
            'Improvement %': improvementPercent
        };

        const configuration = {
            type: 'doughnut',
            data: {
                labels: ['KVRocks Performance', 'SSDB Performance'],
                datasets: [{
                    data: [avgKVRocks, avgSSDB],
                    backgroundColor: ['#4ECDC4', '#FF6B6B'],
                    borderColor: ['#4ECDC4', '#FF6B6B'],
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Performance Summary: KVRocks is ${overallSpeedup.toFixed(1)}x Faster (${improvementPercent.toFixed(1)}% Improvement)`,
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 16
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label;
                                const value = context.parsed;
                                const percentage = ((value / (avgSSDB + avgKVRocks)) * 100).toFixed(1);
                                return `${label}: ${value.toFixed(3)}ms (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('summary_dashboard.png', imageBuffer);
        console.log('✓ Summary dashboard saved as summary_dashboard.png');
        return 'summary_dashboard.png';
    }

    async generateClearCharts() {
        console.log('📊 Generating clear, easy-to-understand comparison charts...\n');

        const results = this.loadBenchmarkResults();
        if (!results) {
            console.error('Could not load benchmark results. Make sure benchmark_results.json exists.');
            return;
        }

        const charts = [];

        try {
            // Generate clear comparison charts
            charts.push(await this.createDirectComparisonChart(results));
            charts.push(await this.createPerformanceGainChart(results));
            charts.push(await this.createLatencyBreakdownChart(results));
            charts.push(await this.createSummaryDashboard(results));

            console.log('\n✅ All clear comparison charts generated successfully!');
            console.log('\nGenerated files:');
            charts.forEach(chart => {
                console.log(`  📈 ${chart}`);
            });

            console.log('\n🎯 CLEAR ANALYSIS SUMMARY:');
            console.log('==========================');
            console.log('✓ Direct comparison showing exact latency differences');
            console.log('✓ Performance gain chart showing speed multipliers');
            console.log('✓ Detailed breakdown of all metrics');
            console.log('✓ Overall summary with key performance indicators');

        } catch (error) {
            console.error('Error generating clear charts:', error);
        }
    }
}

async function main() {
    const generator = new ClearChartGenerator();
    await generator.generateClearCharts();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ClearChartGenerator;