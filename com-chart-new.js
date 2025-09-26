import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const PerformanceDashboard = () => {
  // Data from the benchmark results
  const operationData = [
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

  const radarData = [
    {
      metric: 'Mean Latency',
      SSDB: 19.522,
      KVRocks: 0.166,
      fullMark: 25
    },
    {
      metric: 'P95 Latency',
      SSDB: 31.287, // Average of P95s
      KVRocks: 0.282,
      fullMark: 35
    },
    {
      metric: 'Max Latency',
      SSDB: 49.537, // Average of maxes
      KVRocks: 1.311,
      fullMark: 65
    },
    {
      metric: 'Consistency',
      SSDB: 15, // Lower is better, estimated from variance
      KVRocks: 95, // Higher is better
      fullMark: 100
    }
  ];

  const distributionData = [
    { percentile: 'Min', SSDB: 0.545, KVRocks: 0.102 },
    { percentile: 'P50', SSDB: 20.358, KVRocks: 0.144 },
    { percentile: 'P95', SSDB: 31.287, KVRocks: 0.282 },
    { percentile: 'P99', SSDB: 31.801, KVRocks: 0.515 },
    { percentile: 'Max', SSDB: 49.537, KVRocks: 1.311 }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`${label} Operation`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey.replace('_', ' ')}: ${entry.value.toFixed(3)} ms`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const SpeedIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Database Performance Benchmark
        </h1>
        <p className="text-xl text-gray-600 mb-6">KVRocks vs SSDB Comparison</p>
        
        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl inline-block">
          <div className="flex items-center justify-center space-x-2">
            <SpeedIcon />
            <span className="text-2xl font-bold">KVRocks is 99.2% faster overall</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {operationData.map((op) => (
          <div key={op.operation} className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{op.operation} Operation</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">SSDB Mean:</span>
                <span className="font-semibold text-red-600">{op.SSDB_Mean.toFixed(3)} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">KVRocks Mean:</span>
                <span className="font-semibold text-green-600">{op.KVRocks_Mean.toFixed(3)} ms</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium">Improvement:</span>
                  <span className="font-bold text-green-700">{op.improvement}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Comparison Chart */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Mean Response Time Comparison</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={operationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="operation" />
            <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="SSDB_Mean" fill="#ef4444" name="SSDB" />
            <Bar dataKey="KVRocks_Mean" fill="#10b981" name="KVRocks" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Distribution */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Latency Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="percentile" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="SSDB" stroke="#ef4444" strokeWidth={3} name="SSDB" />
              <Line type="monotone" dataKey="KVRocks" stroke="#10b981" strokeWidth={3} name="KVRocks" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Performance Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis />
              <Radar name="SSDB" dataKey="SSDB" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
              <Radar name="KVRocks" dataKey="KVRocks" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P95 Performance Chart */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">P95 Latency Comparison</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={operationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="operation" />
            <YAxis label={{ value: 'P95 Latency (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="SSDB_P95" fill="#f97316" name="SSDB P95" />
            <Bar dataKey="KVRocks_P95" fill="#06b6d4" name="KVRocks P95" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Analysis Summary */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Performance Analysis</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Key Findings</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                KVRocks delivers <strong>99.2% faster</strong> performance overall
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Consistent low latency across all operations (0.1-0.2ms mean)
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Superior P95/P99 performance indicating better tail latency
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                DELETE operations show the highest improvement (99.5%)
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Recommendations</h3>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-sm text-blue-700 leading-relaxed">
                <strong>Migration to KVRocks is strongly recommended</strong> based on these results. 
                The dramatic performance improvement (99.2% faster) combined with consistent low latency 
                makes KVRocks the clear choice for high-performance applications requiring sub-millisecond 
                response times.
              </p>
            </div>
            
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm text-yellow-700">
                <strong>Next Steps:</strong> Consider implementing the buffer serialization optimizations 
                (JSON-Pack/MessagePack) on KVRocks to achieve even better performance gains.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;