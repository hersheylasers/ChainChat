"use client";

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Sample prediction data (you'd replace with actual AI prediction logic)
const predictionData = [
  { asset: 'Bitcoin', currentPrice: 48647, predictedPrice: 52000, confidence: 0.75, trend: 'up' },
  { asset: 'Ethereum', currentPrice: 3491.46, predictedPrice: 3800, confidence: 0.65, trend: 'up' },
  { asset: 'Solana', currentPrice: null, predictedPrice: 180, confidence: 0.55, trend: 'up' },
];

const portfolioHistoryData = [
  { month: 'Jan', totalValue: 50000 },
  { month: 'Feb', totalValue: 52000 },
  { month: 'Mar', totalValue: 51500 },
  { month: 'Apr', totalValue: 53000 },
  { month: 'May', totalValue: 54000 },
  { month: 'Jun', totalValue: 55000 },
];

const AIAnalyticsDashboard: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  return (
    <div className="bg-black text-white p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">AI Portfolio Analytics</h1>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Portfolio Value Trend */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Portfolio Value Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={portfolioHistoryData}>
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }}
                labelStyle={{ color: 'white' }}
              />
              <Line 
                type="monotone" 
                dataKey="totalValue" 
                stroke="#00ff00" 
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AI Predictions */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">AI Price Predictions</h2>
          <div className="space-y-4">
            {predictionData.map((prediction) => (
              <div 
                key={prediction.asset} 
                className="bg-gray-800 p-3 rounded-lg hover:bg-gray-700 cursor-pointer"
                onClick={() => setSelectedAsset(prediction.asset)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{prediction.asset}</span>
                  <div className="flex items-center">
                    {prediction.trend === 'up' ? (
                      <TrendingUp color="green" className="mr-2" />
                    ) : (
                      <TrendingDown color="red" className="mr-2" />
                    )}
                    <span className="text-sm text-gray-400">
                      {prediction.confidence * 100}% Confidence
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-bold">
                    ${prediction.predictedPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    Predicted from ${prediction.currentPrice?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Asset Modal (simplified) */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">{selectedAsset} Detailed Analysis</h2>
            <p>Detailed AI-powered insights and predictions would be displayed here.</p>
            <button 
              onClick={() => setSelectedAsset(null)}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsDashboard;