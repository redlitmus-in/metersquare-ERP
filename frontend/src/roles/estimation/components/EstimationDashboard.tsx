/**
 * Estimation Dashboard Component
 * Displays comprehensive statistics and analytics for the estimation team
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, Calculator,
  DollarSign, Package, FileText, AlertCircle, CheckCircle,
  XCircle, Clock, Send, Inbox, BarChart3, PieChart,
  Activity, Target, Flag, Zap
} from 'lucide-react';
import { estimationService } from '../services/estimationService';
import type { EstimationDashboardResponse, DashboardSummary } from '../types';

interface EstimationDashboardProps {
  refreshTrigger?: number;
}

export const EstimationDashboard: React.FC<EstimationDashboardProps> = ({ refreshTrigger }) => {
  const [dashboardData, setDashboardData] = useState<EstimationDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'sender' | 'receiver'>('receiver');

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await estimationService.getEstimationDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const renderSummaryCards = (summary: DashboardSummary, title: string, icon: React.ReactNode) => {
    const approvalRate = calculatePercentage(summary.approved_count, summary.total_count);
    const rejectionRate = calculatePercentage(summary.rejected_count, summary.total_count);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Requests */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.total_count}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Value</span>
                  <span className="font-medium truncate ml-2">
                    {formatCurrency(summary.approved_value + summary.rejected_value + summary.pending_value)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Qty</span>
                  <span className="font-medium">
                    {summary.approved_quantity + summary.rejected_quantity + summary.pending_quantity}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved */}
          <Card className="hover:shadow-md transition-shadow border-l-4 border-green-500">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{summary.approved_count}</p>
                <Badge className="bg-green-100 text-green-800 text-xs">{approvalRate}%</Badge>
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-500">
                  Value: <span className="font-medium text-gray-700">{formatCurrency(summary.approved_value)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Quantity: <span className="font-medium text-gray-700">{summary.approved_quantity} items</span>
                </div>
              </div>
              <Progress value={approvalRate} className="h-1 mt-2" />
            </CardContent>
          </Card>

          {/* Rejected */}
          <Card className="hover:shadow-md transition-shadow border-l-4 border-red-500">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold text-red-600">{summary.rejected_count}</p>
                <Badge className="bg-red-100 text-red-800 text-xs">{rejectionRate}%</Badge>
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-[10px] sm:text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                  Cost: {summary.rejection_breakdown.cost_rejections}
                </div>
                <div className="text-[10px] sm:text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                  PM Flag: {summary.rejection_breakdown.pm_flag_rejections}
                </div>
                {summary.rejection_breakdown.other_rejections > 0 && (
                  <div className="text-[10px] sm:text-xs bg-gray-50 text-gray-700 px-1.5 py-0.5 rounded">
                    Other: {summary.rejection_breakdown.other_rejections}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="hover:shadow-md transition-shadow border-l-4 border-amber-500">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">{summary.pending_count}</p>
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-500">
                  Value: <span className="font-medium text-gray-700">{formatCurrency(summary.pending_value)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Quantity: <span className="font-medium text-gray-700">{summary.pending_quantity} items</span>
                </div>
              </div>
              {summary.pending_count > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-amber-700">
                  <AlertCircle className="h-3 w-3" />
                  Requires attention
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-700 font-medium mb-1">Approved Value</p>
                <p className="text-base sm:text-lg font-bold text-green-800">{formatCurrency(summary.approved_value)}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-xs text-red-700 font-medium mb-1">Rejected Value</p>
                <p className="text-base sm:text-lg font-bold text-red-800">{formatCurrency(summary.rejected_value)}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg">
                <p className="text-xs text-amber-700 font-medium mb-1">Pending Value</p>
                <p className="text-base sm:text-lg font-bold text-amber-800">{formatCurrency(summary.pending_value)}</p>
              </div>
            </div>

            {/* Value Distribution Bar */}
            {summary.total_count > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Value Distribution</p>
                <div className="flex h-6 rounded-full overflow-hidden bg-gray-200">
                  {summary.approved_value > 0 && (
                    <div
                      className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{
                        width: `${calculatePercentage(
                          summary.approved_value,
                          summary.approved_value + summary.rejected_value + summary.pending_value
                        )}%`
                      }}
                    >
                      {calculatePercentage(
                        summary.approved_value,
                        summary.approved_value + summary.rejected_value + summary.pending_value
                      ) > 10 && `${calculatePercentage(
                        summary.approved_value,
                        summary.approved_value + summary.rejected_value + summary.pending_value
                      )}%`}
                    </div>
                  )}
                  {summary.rejected_value > 0 && (
                    <div
                      className="bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{
                        width: `${calculatePercentage(
                          summary.rejected_value,
                          summary.approved_value + summary.rejected_value + summary.pending_value
                        )}%`
                      }}
                    >
                      {calculatePercentage(
                        summary.rejected_value,
                        summary.approved_value + summary.rejected_value + summary.pending_value
                      ) > 10 && `${calculatePercentage(
                        summary.rejected_value,
                        summary.approved_value + summary.rejected_value + summary.pending_value
                      )}%`}
                    </div>
                  )}
                  {summary.pending_value > 0 && (
                    <div
                      className="bg-amber-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{
                        width: `${calculatePercentage(
                          summary.pending_value,
                          summary.approved_value + summary.rejected_value + summary.pending_value
                        )}%`
                      }}
                    >
                      {calculatePercentage(
                        summary.pending_value,
                        summary.approved_value + summary.rejected_value + summary.pending_value
                      ) > 10 && `${calculatePercentage(
                        summary.pending_value,
                        summary.approved_value + summary.rejected_value + summary.pending_value
                      )}%`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center space-y-3">
          <Calculator className="h-8 w-8 animate-pulse text-amber-600 mx-auto" />
          <p className="text-sm text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">No dashboard data available</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-900">
              {dashboardData.summary.total_unique_purchases}
            </p>
            <p className="text-xs text-amber-700 mt-1">Unique purchases processed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Send className="h-4 w-4" />
              As Sender
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-900">
              {dashboardData.summary.total_sender_records}
            </p>
            <p className="text-xs text-blue-700 mt-1">Decisions made</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              As Receiver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-900">
              {dashboardData.summary.total_receiver_records}
            </p>
            <p className="text-xs text-green-700 mt-1">Requests received</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'sender' | 'receiver')} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="receiver" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Received Requests
          </TabsTrigger>
          <TabsTrigger value="sender" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent Decisions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receiver" className="space-y-4">
          {renderSummaryCards(
            dashboardData.estimation_as_receiver,
            'Requests Received for Review',
            <Inbox className="h-5 w-5 text-green-600" />
          )}
        </TabsContent>

        <TabsContent value="sender" className="space-y-4">
          {renderSummaryCards(
            dashboardData.estimation_as_sender,
            'Decisions Sent to Other Teams',
            <Send className="h-5 w-5 text-blue-600" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};