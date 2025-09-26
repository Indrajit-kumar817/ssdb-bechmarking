const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');

class DashboardGenerator {
    constructor() {
        this.width = 1400;
        this.height = 900;
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: this.width,
            height: this.height,
            backgroundColour: 'white'
        });
    }

    // Data from the React component
    getOperationData() {
        return [
            {
                operation: 'SET',
                SSDB_Mean: 20.314,
                KVRocks_Mean: 0.192,
                SSDB_P95: 31.358,
                KVRocks_P95: 0.331,
                SSDB_Max: 54.039,
                KVRocks_Max: 1.507,
                improvement: ((20.314 - 0.192) / 20.314 * 100).toFixed(1)
            },
            {
                operation: 'GET',
                SSDB_Mean: 14.931,
                KVRocks_Mean: 0.183,
                SSDB_P95: 30.972,
                KVRocks_P95: 0.322,
                SSDB_Max: 33.075,
                KVRocks_Max: 1.682,
                improvement: ((14.931 - 0.183) / 14.931 * 100).toFixed(1)
            },
            {
                operation: 'DEL',
                SSDB_Mean: 23.321,
                KVRocks_Mean: 0.123,
                SSDB_P95: 31.533,
                KVRocks_P95: 0.192,
                SSDB_Max: 61.499,
                KVRocks_Max: 0.743,
                improvement: ((23.321 - 0.123) / 23.321 * 100).toFixed(1)
            }
        ];
    }

    getDistributionData() {
        return [
            { percentile: 'Min', SSDB: 0.545, KVRocks: 0.102 },
            { percentile: 'P50', SSDB: 20.358, KVRocks: 0.144 },
            { percentile: 'P95', SSDB: 31.287, KVRocks: 0.282 },
            { percentile: 'P99', SSDB: 31.801, KVRocks: 0.515 },
            { percentile: 'Max', SSDB: 49.537, KVRocks: 1.311 }
        ];
    }

    getRadarData() {
        return [
            {
                metric: 'Mean Latency',
                SSDB: 19.522,
                KVRocks: 0.166,
                fullMark: 25
            },
            {
                metric: 'P95 Latency',
                SSDB: 31.287,
                KVRocks: 0.282,
                fullMark: 35
            },
            {
                metric: 'Max Latency',
                SSDB: 49.537,
                KVRocks: 1.311,
                fullMark: 65
            },
            {
                metric: 'Consistency',
                SSDB: 15,
                KVRocks: 95,
                fullMark: 100
            }
        ];
    }

    async createMeanResponseChart() {
        const data = this.getOperationData();

        const configuration = {
            type: 'bar',
            data: {
                labels: data.map(d => d.operation),
                datasets: [
                    {
                        label: 'SSDB Mean (ms)',
                        data: data.map(d => d.SSDB_Mean),
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 2
                    },
                    {
                        label: 'KVRocks Mean (ms)',
                        data: data.map(d => d.KVRocks_Mean),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Mean Response Time Comparison - KVRocks vs SSDB',
                        font: {
                            size: 24,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 16
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const opData = data[context.dataIndex];
                                return `Improvement: ${opData.improvement}%`;
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
        fs.writeFileSync('dashboard_mean_response.png', imageBuffer);
        console.log('✓ Mean response time chart saved as dashboard_mean_response.png');
        return 'dashboard_mean_response.png';
    }

    async createLatencyDistributionChart() {
        const data = this.getDistributionData();

        const configuration = {
            type: 'line',
            data: {
                labels: data.map(d => d.percentile),
                datasets: [
                    {
                        label: 'SSDB',
                        data: data.map(d => d.SSDB),
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        borderWidth: 4,
                        pointRadius: 6,
                        pointBackgroundColor: 'rgb(239, 68, 68)',
                        tension: 0.4
                    },
                    {
                        label: 'KVRocks',
                        data: data.map(d => d.KVRocks),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderWidth: 4,
                        pointRadius: 6,
                        pointBackgroundColor: 'rgb(16, 185, 129)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Latency Distribution Across Percentiles',
                        font: {
                            size: 24,
                            weight: 'bold'
                        }
                    },
                    legend: {
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
                            text: 'Latency (milliseconds)',
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
                            text: 'Percentile',
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
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('dashboard_latency_distribution.png', imageBuffer);
        console.log('✓ Latency distribution chart saved as dashboard_latency_distribution.png');
        return 'dashboard_latency_distribution.png';
    }

    async createP95ComparisonChart() {
        const data = this.getOperationData();

        const configuration = {
            type: 'bar',
            data: {
                labels: data.map(d => d.operation),
                datasets: [
                    {
                        label: 'SSDB P95 (ms)',
                        data: data.map(d => d.SSDB_P95),
                        backgroundColor: 'rgba(249, 115, 22, 0.8)',
                        borderColor: 'rgb(249, 115, 22)',
                        borderWidth: 2
                    },
                    {
                        label: 'KVRocks P95 (ms)',
                        data: data.map(d => d.KVRocks_P95),
                        backgroundColor: 'rgba(6, 182, 212, 0.8)',
                        borderColor: 'rgb(6, 182, 212)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'P95 Latency Comparison - 95th Percentile Performance',
                        font: {
                            size: 24,
                            weight: 'bold'
                        }
                    },
                    legend: {
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
                            text: 'P95 Latency (milliseconds)',
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
        fs.writeFileSync('dashboard_p95_comparison.png', imageBuffer);
        console.log('✓ P95 comparison chart saved as dashboard_p95_comparison.png');
        return 'dashboard_p95_comparison.png';
    }

    async createPerformanceRadarChart() {
        const radarData = this.getRadarData();

        // Normalize radar data for better visualization
        const normalizedData = radarData.map(item => ({
            ...item,
            SSDB_Normalized: Math.min(100, (item.SSDB / item.fullMark) * 100),
            KVRocks_Normalized: Math.min(100, (item.KVRocks / item.fullMark) * 100)
        }));

        const configuration = {
            type: 'radar',
            data: {
                labels: normalizedData.map(d => d.metric),
                datasets: [
                    {
                        label: 'SSDB',
                        data: normalizedData.map(d => d.SSDB_Normalized),
                        backgroundColor: 'rgba(239, 68, 68, 0.3)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgb(239, 68, 68)',
                        pointBorderColor: '#fff',
                        pointRadius: 6
                    },
                    {
                        label: 'KVRocks',
                        data: normalizedData.map(d => d.KVRocks_Normalized),
                        backgroundColor: 'rgba(16, 185, 129, 0.3)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgb(16, 185, 129)',
                        pointBorderColor: '#fff',
                        pointRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Radar Analysis - Multi-Dimensional Comparison',
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 16
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            font: {
                                size: 12
                            }
                        },
                        pointLabels: {
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('dashboard_performance_radar.png', imageBuffer);
        console.log('✓ Performance radar chart saved as dashboard_performance_radar.png');
        return 'dashboard_performance_radar.png';
    }

    async createSummaryChart() {
        const data = this.getOperationData();
        const improvements = data.map(d => parseFloat(d.improvement));

        const configuration = {
            type: 'doughnut',
            data: {
                labels: data.map(d => `${d.operation} (${d.improvement}% better)`),
                datasets: [{
                    data: improvements,
                    backgroundColor: [
                        '#ef4444',
                        '#f97316',
                        '#eab308'
                    ],
                    borderColor: [
                        '#dc2626',
                        '#ea580c',
                        '#ca8a04'
                    ],
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Improvement Summary - KVRocks vs SSDB',
                        font: {
                            size: 24,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed}% improvement`;
                            }
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('dashboard_improvement_summary.png', imageBuffer);
        console.log('✓ Improvement summary chart saved as dashboard_improvement_summary.png');
        return 'dashboard_improvement_summary.png';
    }

    async generateDashboard() {
        console.log('📊 Generating comprehensive performance dashboard...\n');

        const charts = [];

        try {
            // Generate all dashboard charts
            charts.push(await this.createMeanResponseChart());
            charts.push(await this.createLatencyDistributionChart());
            charts.push(await this.createP95ComparisonChart());
            charts.push(await this.createPerformanceRadarChart());
            charts.push(await this.createSummaryChart());

            // Generate analysis report
            const report = this.generateAnalysisReport();

            console.log('\n✅ Performance dashboard generated successfully!');
            console.log('\nGenerated charts:');
            charts.forEach(chart => {
                console.log(`  📈 ${chart}`);
            });
            console.log('  📄 dashboard_analysis.json');

            console.log('\n🎯 DASHBOARD INSIGHTS:');
            console.log('=====================');
            console.log(`• Overall Performance: KVRocks is 99.2% faster`);
            console.log(`• Best Improvement: DELETE operations (${this.getOperationData()[2].improvement}%)`);
            console.log(`• Consistent Performance: KVRocks maintains sub-millisecond latency`);
            console.log(`• Superior Tail Latency: Excellent P95/P99 performance`);

            return charts;

        } catch (error) {
            console.error('Error generating dashboard:', error);
        }
    }

    generateAnalysisReport() {
        const operationData = this.getOperationData();
        const report = {
            timestamp: new Date().toISOString(),
            overallImprovement: '99.2%',
            keyFindings: [
                'KVRocks delivers 99.2% faster performance overall',
                'Consistent low latency across all operations (0.1-0.2ms mean)',
                'Superior P95/P99 performance indicating better tail latency',
                'DELETE operations show the highest improvement (99.5%)'
            ],
            operationBreakdown: operationData,
            recommendations: {
                primary: 'Migration to KVRocks is strongly recommended based on these results',
                reasoning: 'The dramatic performance improvement (99.2% faster) combined with consistent low latency makes KVRocks the clear choice for high-performance applications requiring sub-millisecond response times',
                nextSteps: 'Consider implementing buffer serialization optimizations (JSON-Pack/MessagePack) on KVRocks to achieve even better performance gains'
            }
        };

        fs.writeFileSync('dashboard_analysis.json', JSON.stringify(report, null, 2));
        console.log('✓ Analysis report saved as dashboard_analysis.json');
        return report;
    }
}

async function main() {
    const generator = new DashboardGenerator();
    await generator.generateDashboard();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DashboardGenerator;