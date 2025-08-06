import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">
          Business insights and performance metrics
        </p>
      </div>

      {/* Coming Soon */}
      <div className="card">
        <div className="card-body text-center py-12">
          <ChartBarIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Analytics Dashboard</h3>
          <p className="mt-2 text-gray-500">
            Advanced analytics and reporting features are coming soon.
          </p>
          <div className="mt-6">
            <button className="btn-primary">
              Request Early Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;