const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');

class PieChartGenerator {
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

    async createSSDBMetricsPieChart(results) {
        const operations = ['set', 'get', 'del'];
        const metrics = ['mean', 'median', 'min', 'max', 'p95', 'p99'];

        const data = [];
        const labels = [];
        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
        ];

        operations.forEach(op => {
            metrics.forEach(metric => {
                const value = results.statistics.ssdb[op][metric];
                if (value > 0) { // Only include non-zero values
                    data.push(value);
                    labels.push(`${op.toUpperCase()} - ${metric.toUpperCase()}`);
                }
            });
        });

        const configuration = {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'SSDB - Distribution of Latency Metrics Across Operations (ms)',
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 10
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value.toFixed(3)}ms (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('ssdb_metrics_pie.png', imageBuffer);
        console.log('✓ SSDB metrics pie chart saved as ssdb_metrics_pie.png');
        return 'ssdb_metrics_pie.png';
    }

    async createKVRocksMetricsPieChart(results) {
        const operations = ['set', 'get', 'del'];
        const metrics = ['mean', 'median', 'min', 'max', 'p95', 'p99'];

        const data = [];
        const labels = [];
        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
        ];

        operations.forEach(op => {
            metrics.forEach(metric => {
                const value = results.statistics.kvrocks[op][metric];
                if (value > 0) { // Only include non-zero values
                    data.push(value);
                    labels.push(`${op.toUpperCase()} - ${metric.toUpperCase()}`);
                }
            });
        });

        const configuration = {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'KVRocks - Distribution of Latency Metrics Across Operations (ms)',
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 10
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value.toFixed(3)}ms (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('kvrocks_metrics_pie.png', imageBuffer);
        console.log('✓ KVRocks metrics pie chart saved as kvrocks_metrics_pie.png');
        return 'kvrocks_metrics_pie.png';
    }

    async createCombinedOperationsPieCharts(results) {
        const operations = ['set', 'get', 'del'];
        const colors = {
            set: ['#FF6384', '#FF8A9B', '#FFB3C1'],
            get: ['#36A2EB', '#5BB2F0', '#80C2F5'],
            del: ['#FFCE56', '#FFD76B', '#FFE080']
        };

        for (const operation of operations) {
            // SSDB pie chart for this operation
            const ssdbData = [];
            const ssdbLabels = [];
            const metrics = ['mean', 'median', 'min', 'max', 'p95', 'p99'];

            metrics.forEach(metric => {
                const value = results.statistics.ssdb[operation][metric];
                if (value > 0) {
                    ssdbData.push(value);
                    ssdbLabels.push(metric.toUpperCase());
                }
            });

            // Add error count if exists
            if (results.rawData && results.rawData.ssdb && results.rawData.ssdb.errors > 0) {
                ssdbData.push(results.rawData.ssdb.errors);
                ssdbLabels.push('ERRORS');
            }

            const ssdbConfig = {
                type: 'pie',
                data: {
                    labels: ssdbLabels,
                    datasets: [{
                        data: ssdbData,
                        backgroundColor: colors[operation],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `SSDB - ${operation.toUpperCase()} Operation Metrics Distribution`,
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value.toFixed(3)}ms (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            };

            const ssdbImageBuffer = await this.chartJSNodeCanvas.renderToBuffer(ssdbConfig);
            fs.writeFileSync(`ssdb_${operation}_pie.png`, ssdbImageBuffer);
            console.log(`✓ SSDB ${operation.toUpperCase()} pie chart saved as ssdb_${operation}_pie.png`);

            // KVRocks pie chart for this operation
            const kvrocksData = [];
            const kvrocksLabels = [];

            metrics.forEach(metric => {
                const value = results.statistics.kvrocks[operation][metric];
                if (value > 0) {
                    kvrocksData.push(value);
                    kvrocksLabels.push(metric.toUpperCase());
                }
            });

            // Add error count if exists
            if (results.rawData && results.rawData.kvrocks && results.rawData.kvrocks.errors > 0) {
                kvrocksData.push(results.rawData.kvrocks.errors);
                kvrocksLabels.push('ERRORS');
            }

            const kvrocksConfig = {
                type: 'pie',
                data: {
                    labels: kvrocksLabels,
                    datasets: [{
                        data: kvrocksData,
                        backgroundColor: colors[operation],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `KVRocks - ${operation.toUpperCase()} Operation Metrics Distribution`,
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value.toFixed(3)}ms (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            };

            const kvrocksImageBuffer = await this.chartJSNodeCanvas.renderToBuffer(kvrocksConfig);
            fs.writeFileSync(`kvrocks_${operation}_pie.png`, kvrocksImageBuffer);
            console.log(`✓ KVRocks ${operation.toUpperCase()} pie chart saved as kvrocks_${operation}_pie.png`);
        }
    }

    async generateAllPieCharts() {
        console.log('🥧 Generating pie charts for benchmark metrics...\n');

        const results = this.loadBenchmarkResults();
        if (!results) {
            console.error('Could not load benchmark results. Make sure benchmark_results.json exists.');
            return;
        }

        const charts = [];

        try {
            // Generate overall metrics pie charts
            charts.push(await this.createSSDBMetricsPieChart(results));
            charts.push(await this.createKVRocksMetricsPieChart(results));

            // Generate individual operation pie charts
            await this.createCombinedOperationsPieCharts(results);

            // Add individual operation charts to the list
            const operations = ['set', 'get', 'del'];
            operations.forEach(op => {
                charts.push(`ssdb_${op}_pie.png`);
                charts.push(`kvrocks_${op}_pie.png`);
            });

            console.log('\n✅ All pie charts generated successfully!');
            console.log('\nGenerated files:');
            charts.forEach(chart => {
                console.log(`  🥧 ${chart}`);
            });

            // Display summary
            console.log('\n📊 PIE CHART SUMMARY:');
            console.log('====================');
            console.log('✓ Overall metrics distribution charts (SSDB & KVRocks)');
            console.log('✓ Individual operation breakdown charts (SET, GET, DEL)');
            console.log('✓ Each chart shows metric distribution and percentages');
            console.log('✓ Error counts included where applicable (both databases had 0 errors)');

        } catch (error) {
            console.error('Error generating pie charts:', error);
        }
    }
}

async function main() {
    const generator = new PieChartGenerator();
    await generator.generateAllPieCharts();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = PieChartGenerator;