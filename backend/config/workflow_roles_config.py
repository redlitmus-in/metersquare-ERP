"""
Workflow-based Role configuration for MeterSquare ERP
Based on Material Purchases - Project Bound workflow
"""

# Roles from the workflow diagram
WORKFLOW_ROLES = {
    'siteSupervisor': {
        'title': 'Site Supervisor',
        'level': 3,
        'tier': 'Operations',
        'approval_limit': 10000,
        'can_approve': [],
        'can_initiate': ['purchase_requisition'],
        'permissions': [
            'create_purchase_request',
            'view_site_materials',
            'request_materials',
            'view_task_status'
        ],
        'description': 'Site operations and material requisition',
        'color': '#ea580c',
        'icon': 'HardHat'
    },
    'mepSupervisor': {
        'title': 'MEP Supervisor',
        'level': 3,
        'tier': 'Operations',
        'approval_limit': 10000,
        'can_approve': [],
        'can_initiate': ['purchase_requisition'],
        'permissions': [
            'create_purchase_request',
            'view_mep_materials',
            'request_materials',
            'view_task_status'
        ],
        'description': 'MEP operations and material requisition',
        'color': '#0891b2',
        'icon': 'Activity'
    },
    'procurement': {
        'title': 'Procurement',
        'level': 3,
        'tier': 'Support',
        'approval_limit': 10000,
        'can_approve': ['small_purchases'],
        'permissions': [
            'manage_procurement',
            'vendor_evaluation',
            'create_purchase_orders',
            'manage_vendors',
            'process_requisitions',
            'qty_spec_flag_check'
        ],
        'description': 'Procurement and vendor management',
        'color': '#dc2626',
        'icon': 'ShoppingCart'
    },
    'projectManager': {
        'title': 'Project Manager',
        'level': 2,
        'tier': 'Management',
        'approval_limit': 50000,
        'can_approve': ['purchase_request', 'project_task', 'material_request'],
        'permissions': [
            'manage_projects',
            'approve_mid_range',
            'team_coordination',
            'pm_flag_approval',
            'qty_spec_approvals',
            'view_cost_analysis'
        ],
        'description': 'Project coordination and approvals',
        'color': '#059669',
        'icon': 'UserCheck'
    },
    'design': {
        'title': 'Design',
        'level': 3,
        'tier': 'Technical',
        'approval_limit': 0,
        'can_approve': [],
        'permissions': [
            'review_specifications',
            'provide_reference_inputs',
            'design_approval',
            'technical_review'
        ],
        'description': 'Design reference and technical inputs',
        'color': '#8b5cf6',
        'icon': 'Layers'
    },
    'estimation': {
        'title': 'Estimation',
        'level': 3,
        'tier': 'Technical',
        'approval_limit': 0,
        'can_approve': [],
        'permissions': [
            'cost_analysis',
            'qty_spec_validation',
            'cost_flag_check',
            'budget_validation',
            'provide_cost_estimates'
        ],
        'description': 'Cost estimation and validation',
        'color': '#f59e0b',
        'icon': 'Calculator'
    },
    'accounts': {
        'title': 'Accounts',
        'level': 3,
        'tier': 'Support',
        'approval_limit': 0,
        'can_approve': ['payment_processing'],
        'permissions': [
            'financial_management',
            'invoice_processing',
            'payment_transactions',
            'acknowledgement_processing',
            'financial_reporting'
        ],
        'description': 'Financial management and payments',
        'color': '#16a34a',
        'icon': 'DollarSign'
    },
    'technicalDirector': {
        'title': 'Technical Director',
        'level': 1,
        'tier': 'Management',
        'approval_limit': None,  # No limit
        'can_approve': ['all'],
        'permissions': [
            'final_approval',
            'flag_override',
            'technical_decisions',
            'approve_high_value',
            'strategic_planning'
        ],
        'description': 'Final approvals and technical decisions',
        'color': '#1e40af',
        'icon': 'Briefcase'
    }
}

# Workflow FLAGS (not roles, but approval gates)
WORKFLOW_FLAGS = {
    'QTY_SPEC_FLAG': {
        'name': 'Quantity & Specification Flag',
        'check_by': ['procurement', 'projectManager'],
        'description': 'Validates quantity and specifications',
        'type': 'approval_gate'
    },
    'PM_FLAG': {
        'name': 'Project Manager Flag',
        'check_by': ['projectManager'],
        'description': 'Project Manager approval required',
        'type': 'approval_gate'
    },
    'COST_FLAG': {
        'name': 'Cost Flag',
        'check_by': ['estimation', 'projectManager'],
        'description': 'Cost validation and approval',
        'type': 'approval_gate'
    },
    'FLAG': {
        'name': 'General Flag',
        'check_by': ['technicalDirector'],
        'description': 'Final technical approval',
        'type': 'approval_gate'
    }
}

# Workflow stages
WORKFLOW_STAGES = [
    {
        'stage': 1,
        'name': 'Initiation',
        'actors': ['siteSupervisor', 'mepSupervisor'],
        'action': 'Purchase requisition form',
        'next': 'procurement'
    },
    {
        'stage': 2,
        'name': 'Procurement Processing',
        'actors': ['procurement'],
        'action': 'Process requisition',
        'flags': ['QTY_SPEC_FLAG'],
        'next': 'projectManager'
    },
    {
        'stage': 3,
        'name': 'Project Manager Review',
        'actors': ['projectManager'],
        'action': 'Review and approve',
        'flags': ['PM_FLAG', 'QTY_SPEC_FLAG'],
        'next': 'estimation'
    },
    {
        'stage': 4,
        'name': 'Cost Analysis',
        'actors': ['estimation'],
        'action': 'Cost validation',
        'flags': ['COST_FLAG'],
        'references': ['design'],
        'next': 'technicalDirector'
    },
    {
        'stage': 5,
        'name': 'Final Approval',
        'actors': ['technicalDirector'],
        'action': 'Final approval',
        'flags': ['FLAG'],
        'next': 'accounts'
    },
    {
        'stage': 6,
        'name': 'Payment Processing',
        'actors': ['accounts'],
        'action': 'Payment transaction',
        'next': 'completion'
    },
    {
        'stage': 7,
        'name': 'Task Completion',
        'actors': ['siteSupervisor', 'mepSupervisor'],
        'action': 'Acknowledge completion',
        'next': None
    }
]

def get_workflow_role_permissions(role_name):
    """Get permissions for a specific workflow role"""
    role_config = WORKFLOW_ROLES.get(role_name, {})
    return role_config.get('permissions', [])

def get_workflow_role_approval_limit(role_name):
    """Get approval limit for a specific workflow role"""
    role_config = WORKFLOW_ROLES.get(role_name, {})
    return role_config.get('approval_limit', 0)

def can_role_check_flag(role_name, flag_name):
    """Check if a role can validate a specific flag"""
    flag_config = WORKFLOW_FLAGS.get(flag_name, {})
    return role_name in flag_config.get('check_by', [])

def get_next_stage_actors(current_stage):
    """Get the actors for the next stage in workflow"""
    for stage in WORKFLOW_STAGES:
        if stage['stage'] == current_stage:
            next_stage_name = stage.get('next')
            if next_stage_name:
                for next_stage in WORKFLOW_STAGES:
                    if next_stage['name'].lower().replace(' ', '_') == next_stage_name:
                        return next_stage.get('actors', [])
    return []