import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, HardHat, Wrench, ShoppingCart, UserCheck, Building, DollarSign, 
  CheckCircle, Calculator, FileText, AlertCircle, BarChart3, Settings, Target,
  Truck, Award, Calendar, Package
} from 'lucide-react';
import { toast } from 'sonner';
import { apiWrapper, API_ENDPOINTS } from '@/api/config';
import { Role, Process, ProcessConnection } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// API Response types
interface HierarchyData {
  hierarchy: {
    [tier: string]: Array<{
      role: Role;
      processes: Process[];
    }>;
  };
  workflow_connections: ProcessConnection[];
}

// Your original component data structure (converted to use API data)
const ProcessFlowPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [connections, setConnections] = useState<ProcessConnection[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProcessFlowData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch organizational hierarchy
        const hierarchyData: HierarchyData = await apiWrapper.get(API_ENDPOINTS.PROCESSES.HIERARCHY);
        
        // Extract roles and processes
        const allRoles: Role[] = [];
        const allProcesses: Process[] = [];
        
        Object.entries(hierarchyData.hierarchy).forEach(([, tierRoles]) => {
          tierRoles.forEach((roleData) => {
            allRoles.push(roleData.role);
            allProcesses.push(...roleData.processes);
          });
        });
        
        setRoles(allRoles);
        setProcesses(allProcesses);
        setConnections(hierarchyData.workflow_connections);
      } catch (error) {
        console.error('Failed to load process flow data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load process flow data';
        setError(errorMessage);
        toast.error('Failed to load process flow data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProcessFlowData();
  }, []);

  const handleRoleClick = (roleId: string) => {
    setActiveRole(prev => prev === roleId ? null : roleId);
  };

  const activeConnections = activeRole ? connections.filter(c => 
    c.from_role === activeRole || c.to_role === activeRole
  ) : [];

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'Briefcase': Briefcase,
      'UserCheck': UserCheck,
      'HardHat': HardHat,
      'Wrench': Wrench,
      'ShoppingCart': ShoppingCart,
      'DollarSign': DollarSign,
      'Building': Building,
      'Truck': Truck,
      'BarChart3': BarChart3,
      'Target': Target,
      'Calendar': Calendar,
      'Users': Users,
      'Settings': Settings,
      'CheckCircle': CheckCircle,
      'Package': Package,
      'FileText': FileText,
      'Calculator': Calculator,
      'Award': Award,
    };
    
    return iconMap[iconName] || Settings;
  };

  const getColorClass = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      '#3b82f6': 'role-color-blue',
      '#10b981': 'role-color-green',
      '#8b5cf6': 'role-color-purple',
      '#ef4444': 'role-color-red',
      '#f59e0b': 'role-color-yellow',
      '#6366f1': 'role-color-indigo',
      '#ec4899': 'role-color-pink',
      '#f97316': 'role-color-orange',
      '#14b8a6': 'role-color-teal',
      '#06b6d4': 'role-color-cyan',
    };
    
    return colorMap[color] || 'role-color-blue';
  };

  const ProcessChild: React.FC<{ 
    process: Process; 
    isActive: boolean; 
    roleColor: string; 
    showSteps?: boolean;
  }> = ({ process, isActive, roleColor, showSteps = false }) => {
    const IconComponent = getIconComponent(process.icon || 'Settings');
    
    return (
      <div className={`process-child ${isActive ? 'active' : ''}`}>
        <div className="flex items-center mb-2">
          <IconComponent size={14} className="mr-2" color={roleColor} />
          <span className="font-bold text-xs">{process.name}</span>
        </div>
        <div className="text-xs text-gray-600 mb-2">{process.description}</div>
        {process.approval_limit && (
          <div className="approval-badge mb-2">
            {process.approval_limit}
          </div>
        )}
        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
          {process.frequency}
        </div>
        {process.steps && showSteps && (
          <div className="mt-2 text-xs text-gray-500">
            <div className="font-semibold mb-1 text-blue-700">Key Steps:</div>
            <div className="bg-blue-50 p-2 rounded border">
              <ol className="list-decimal list-inside space-y-1">
                {process.steps.map((step, index) => (
                  <li key={index} className="text-gray-700">{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    );
  };

  const RoleTree: React.FC<{ 
    role: Role; 
    roleProcesses: Process[];
    activeConnections: ProcessConnection[];
    onClick: (roleId: string) => void;
    isActive: boolean;
  }> = ({ role, roleProcesses, activeConnections, onClick, isActive }) => {
    const IconComponent = getIconComponent(role.icon);
    
    const isProcessActive = (processId: string) => {
      return activeConnections.some(c => 
        c.from_process === processId || c.to_process === processId
      );
    };

    return (
      <div className="role-tree" onClick={() => onClick(role.id)}>
        <div 
          id={`role-${role.id}`}
          className={`role-node cursor-pointer ${getColorClass(role.color)}`}
          data-role-color
        >
          <div className="flex items-center mb-3">
            <div className="rounded-full p-3 mr-3 shadow-lg icon-container" 
                 data-role-color>
              <IconComponent size={24} color={role.color} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{role.title}</h3>
              <p className="text-sm text-gray-500">{role.tier}</p>
            </div>
          </div>
          <div className="tree-connector vertical-line" data-role-color></div>
        </div>

        <div className="process-children">
          {roleProcesses.map((process, index) => (
            <div key={index} className="relative">
              {index === 1 && (
                <div className="tree-connector vertical-line absolute -top-8 h-8" 
                     data-role-color></div>
              )}
              <ProcessChild 
                process={process} 
                isActive={isProcessActive(process.id)}
                roleColor={role.color}
                showSteps={isActive}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800">Failed to Load Process Flow</h3>
        <p className="text-gray-600 text-center max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const groupRolesByTier = () => {
    const tiers = {
      'Management Tier': roles.filter(r => r.tier === 'Management Tier'),
      'Operations Tier': roles.filter(r => r.tier === 'Operations Tier'),
      'Support Tier': roles.filter(r => r.tier === 'Support Tier'),
    };
    return tiers;
  };

  const tierGroups = groupRolesByTier();

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen font-sans p-6">
      <style>{`
        .role-node {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 3px solid;
          border-radius: 16px;
          padding: 16px;
          margin: 8px;
          min-width: 220px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          position: relative;
        }
        .role-node:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 35px rgba(0,0,0,0.15);
        }
        .process-child {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          margin: 8px 0;
          font-size: 11px;
          transition: all 0.3s ease;
          position: relative;
        }
        .process-child.active {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #3b82f6;
          transform: scale(1.02);
        }
        .tree-connector {
          position: absolute;
          background: #64748b;
          z-index: 1;
          border-radius: 2px;
        }
        .vertical-line {
          width: 3px;
          height: 40px;
          left: 50%;
          transform: translateX(-50%);
          top: 100%;
        }
        .tree-level {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          margin: 40px 0;
          position: relative;
        }
        .role-tree {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 20px;
          position: relative;
        }
        .process-children {
          display: flex;
          gap: 16px;
          margin-top: 30px;
          position: relative;
        }
        .approval-badge {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 8px;
          font-weight: bold;
        }
        
        /* Dynamic color classes using CSS custom properties */
        .role-node[data-role-color] {
          border-color: var(--role-color);
        }
        
        .icon-container[data-role-color] {
          background: linear-gradient(135deg, var(--role-color-20) 0%, var(--role-color-40) 100%);
        }
        
        .tree-connector[data-role-color] {
          background: var(--role-color);
        }
        
        .connection-border[data-role-color] {
          border-color: var(--role-color);
        }
        
        /* Predefined color classes to avoid inline styles */
        .role-color-blue { --role-color: #3b82f6; --role-color-20: #3b82f620; --role-color-40: #3b82f640; }
        .role-color-green { --role-color: #10b981; --role-color-20: #10b98120; --role-color-40: #10b98140; }
        .role-color-purple { --role-color: #8b5cf6; --role-color-20: #8b5cf620; --role-color-40: #8b5cf640; }
        .role-color-red { --role-color: #ef4444; --role-color-20: #ef444420; --role-color-40: #ef444440; }
        .role-color-yellow { --role-color: #f59e0b; --role-color-20: #f59e0b20; --role-color-40: #f59e0b40; }
        .role-color-indigo { --role-color: #6366f1; --role-color-20: #6366f120; --role-color-40: #6366f140; }
        .role-color-pink { --role-color: #ec4899; --role-color-20: #ec489920; --role-color-40: #ec489940; }
        .role-color-orange { --role-color: #f97316; --role-color-20: #f9731620; --role-color-40: #f9731640; }
        .role-color-teal { --role-color: #14b8a6; --role-color-20: #14b8a620; --role-color-40: #14b8a640; }
        .role-color-cyan { --role-color: #06b6d4; --role-color-20: #06b6d420; --role-color-40: #06b6d440; }
      `}</style>
      
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Corporate Interiors ERP System
        </h1>
        <p className="text-lg text-gray-700 mb-2">Official Process Flow Documentation</p>
        <p className="text-sm text-gray-600">
          {activeRole ? `Showing processes for: ${roles.find(r => r.id === activeRole)?.title}` : 'Click any role to see official process connections'}
        </p>
      </div>

      {/* Management Tier */}
      {tierGroups['Management Tier'].length > 0 && (
        <div className="tree-level">
          <h2 className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-800 text-white px-6 py-2 rounded-full text-sm font-bold">
            🏛️ MANAGEMENT TIER
          </h2>
          {tierGroups['Management Tier'].map(role => (
            <RoleTree 
              key={role.id}
              role={role}
              roleProcesses={processes.filter(p => p.role_id === role.id)}
              activeConnections={activeConnections}
              onClick={handleRoleClick}
              isActive={activeRole === role.id}
            />
          ))}
        </div>
      )}

      {/* Operations Tier */}
      {tierGroups['Operations Tier'].length > 0 && (
        <div className="tree-level">
          <h2 className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-800 text-white px-6 py-2 rounded-full text-sm font-bold">
            ⚙️ OPERATIONS TIER
          </h2>
          {tierGroups['Operations Tier'].map(role => (
            <RoleTree 
              key={role.id}
              role={role}
              roleProcesses={processes.filter(p => p.role_id === role.id)}
              activeConnections={activeConnections}
              onClick={handleRoleClick}
              isActive={activeRole === role.id}
            />
          ))}
        </div>
      )}

      {/* Support Tier */}
      {tierGroups['Support Tier'].length > 0 && (
        <div className="tree-level">
          <h2 className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-800 text-white px-6 py-2 rounded-full text-sm font-bold">
            🛠️ SUPPORT TIER
          </h2>
          {tierGroups['Support Tier'].map(role => (
            <RoleTree 
              key={role.id}
              role={role}
              roleProcesses={processes.filter(p => p.role_id === role.id)}
              activeConnections={activeConnections}
              onClick={handleRoleClick}
              isActive={activeRole === role.id}
            />
          ))}
        </div>
      )}

      {/* Active Role Details */}
      {activeRole && (
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {roles.find(r => r.id === activeRole)?.title} - Official Process Documentation
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Connected Processes:</h4>
                             {activeConnections.map((conn, index) => {
                 const isOutgoing = conn.from_role === activeRole;
                 const connectedRole = isOutgoing ? conn.to_role : conn.from_role;
                
                return (
                  <div key={index} className={`border-l-4 pl-4 mb-4 bg-gray-50 p-3 rounded connection-border ${getColorClass(roles.find(r => r.id === connectedRole)?.color || '#3b82f6')}`} 
                       data-role-color>
                    <div className="font-semibold text-gray-800 text-sm">
                      {isOutgoing ? '→' : '←'} {roles.find(r => r.id === connectedRole)?.title}
                    </div>
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2">
                      <div className="font-medium">{processes.find(p => p.id === conn.from_process)?.name}</div>
                      <div className="text-center text-gray-400 my-1">↓</div>
                      <div className="font-medium">{processes.find(p => p.id === conn.to_process)?.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                All Processes ({processes.filter(p => p.role_id === activeRole).length}):
              </h4>
              <div className="space-y-4">
                {processes.filter(p => p.role_id === activeRole).map((process, index) => {
                  const hasConnections = activeConnections.some(conn => 
                    conn.from_process === process.id || conn.to_process === process.id
                  );
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border-2 ${
                      hasConnections ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="font-medium text-gray-800 flex items-center mb-2">
                        <span className="text-base">{process.name}</span>
                        {hasConnections && (
                          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                            Connected
                          </span>
                        )}
                        {process.approval_limit && (
                          <span className="ml-2 approval-badge">
                            {process.approval_limit}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">{process.description}</div>
                      
                      <div className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full inline-block mb-3">
                        Frequency: {process.frequency}
                      </div>
                      
                      {process.steps && process.steps.length > 0 && (
                        <div className="mt-3">
                          <div className="font-semibold mb-2 text-purple-700 text-sm flex items-center">
                            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                            Key Process Steps:
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <ol className="list-decimal list-inside space-y-2 text-sm text-purple-900">
                              {process.steps.map((step, idx) => (
                                <li key={idx} className="leading-relaxed">
                                  <span className="ml-1">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessFlowPage;