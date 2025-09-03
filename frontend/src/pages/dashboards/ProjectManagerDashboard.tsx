import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Briefcase, Users, Calendar, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Activity, Target, FileText, ArrowUpRight, ArrowDownRight,
  MoreVertical, Download, Filter, RefreshCw, Layers, GitBranch, Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ProjectManagerDashboard: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState('all');

  // Project Timeline Data
  const timelineData = [
    { week: 'W1', planned: 20, actual: 18 },
    { week: 'W2', planned: 35, actual: 32 },
    { week: 'W3', planned: 50, actual: 48 },
    { week: 'W4', planned: 65, actual: 60 },
    { week: 'W5', planned: 80, actual: 75 },
    { week: 'W6', planned: 95, actual: 87 },
  ];

  // Resource Allocation Data
  const resourceData = [
    { name: 'Design', value: 25, color: '#8b5cf6' },
    { name: 'Development', value: 40, color: '#3b82f6' },
    { name: 'Testing', value: 20, color: '#10b981' },
    { name: 'Deployment', value: 15, color: '#f59e0b' },
  ];

  // Team Performance Radar
  const teamPerformance = [
    { skill: 'Technical', A: 85, B: 90 },
    { skill: 'Communication', A: 92, B: 85 },
    { skill: 'Problem Solving', A: 88, B: 87 },
    { skill: 'Time Management', A: 78, B: 92 },
    { skill: 'Quality', A: 90, B: 88 },
    { skill: 'Innovation', A: 85, B: 82 },
  ];

  // Task Distribution
  const taskData = [
    { status: 'Completed', count: 124, percentage: 45 },
    { status: 'In Progress', count: 89, percentage: 32 },
    { status: 'Pending', count: 42, percentage: 15 },
    { status: 'Blocked', count: 22, percentage: 8 },
  ];

  // Key Metrics
  const metrics = [
    {
      title: 'Active Projects',
      value: '12',
      change: '+2',
      trend: 'up' as const,
      period: 'This month',
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Team Members',
      value: '48',
      change: '+5',
      trend: 'up' as const,
      period: 'Total',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tasks Completed',
      value: '234',
      change: '+18%',
      trend: 'up' as const,
      period: 'This week',
      icon: CheckCircle2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Delivery Rate',
      value: '87%',
      change: '-3%',
      trend: 'down' as const,
      period: 'On time',
      icon: Timer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  // Active Projects List
  const activeProjects = [
    { name: 'Marina Tower Complex', progress: 75, status: 'on-track', deadline: '2024-03-15', budget: 'AED 2.5M' },
    { name: 'Business Bay Office', progress: 45, status: 'delayed', deadline: '2024-04-20', budget: 'AED 1.8M' },
    { name: 'JBR Residential', progress: 90, status: 'on-track', deadline: '2024-02-28', budget: 'AED 3.2M' },
    { name: 'Downtown Retail', progress: 30, status: 'at-risk', deadline: '2024-05-10', budget: 'AED 1.2M' },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Manager Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor and manage all active projects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{metric.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.trend === 'up' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">{metric.change}</span>
                      </div>
                      <span className="text-xs text-gray-500">{metric.period}</span>
                    </div>
                  </div>
                  <div className={`${metric.bgColor} p-3 rounded-lg`}>
                    <metric.icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Project Timeline & Resource Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <CardTitle>Project Timeline Progress</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="planned" 
                  stroke="#3b82f6" 
                  fillOpacity={1}
                  fill="url(#colorPlanned)"
                  strokeWidth={2}
                  name="Planned %"
                />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10b981" 
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  strokeWidth={2}
                  name="Actual %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resource Allocation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              <CardTitle>Resource Allocation</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={resourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {resourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {resourceData.map((resource) => (
                <div key={resource.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: resource.color }}
                    />
                    <span className="text-sm text-gray-600">{resource.name}</span>
                  </div>
                  <span className="text-sm font-medium">{resource.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance & Task Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance Radar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <CardTitle>Team Performance Analysis</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={teamPerformance}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="skill" stroke="#888" fontSize={12} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#888" fontSize={10} />
                <Radar name="Team A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Team B" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-orange-500" />
              <CardTitle>Task Distribution</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {taskData.map((task, index) => (
              <div key={task.status} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{task.status}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{task.count} tasks</span>
                    <Badge variant="outline">{task.percentage}%</Badge>
                  </div>
                </div>
                <Progress 
                  value={task.percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': index === 0 ? '#10b981' : 
                                            index === 1 ? '#3b82f6' :
                                            index === 2 ? '#f59e0b' : '#ef4444'
                  } as React.CSSProperties}
                />
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Tasks</span>
                <span className="text-lg font-bold">277</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeProjects.map((project) => (
              <div key={project.name} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-500">Budget: {project.budget}</span>
                      <span className="text-sm text-gray-500">Deadline: {project.deadline}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      project.status === 'on-track' ? 'default' :
                      project.status === 'delayed' ? 'destructive' : 'secondary'
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagerDashboard;