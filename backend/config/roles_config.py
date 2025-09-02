"""
Role configuration for MeterSquare ERP
Defines role hierarchy, permissions, and approval limits
Based on Material Purchases - Project Bound workflow
"""

# Role hierarchy - lower level number means higher authority
# Roles match the workflow diagram exactly
ROLE_HIERARCHY = {
    'siteSupervisor': {
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
        'description': 'Site Supervisor - Site operations and material requisition',
        'color': '#ea580c',
        'icon': 'HardHat'
    },
    'mepSupervisor': {
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
        'description': 'MEP Supervisor - MEP operations and material requisition',
        'color': '#0891b2',
        'icon': 'Activity'
    },
    'procurement': {
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
        'description': 'Procurement - Procurement and vendor management',
        'color': '#dc2626',
        'icon': 'ShoppingCart'
    },
    'projectManager': {
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
        'description': 'Project Manager - Project coordination and approvals',
        'color': '#059669',
        'icon': 'UserCheck'
    },
    'design': {
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
        'description': 'Design - Design reference and technical inputs',
        'color': '#8b5cf6',
        'icon': 'Layers'
    },
    'estimation': {
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
        'description': 'Estimation - Cost estimation and validation',
        'color': '#f59e0b',
        'icon': 'Calculator'
    },
    'accounts': {
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
        'description': 'Accounts - Financial management and payments',
        'color': '#16a34a',
        'icon': 'DollarSign'
    },
    'technicalDirector': {
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
        'description': 'Technical Director - Final approvals and technical decisions',
        'color': '#1e40af',
        'icon': 'Briefcase'
    }
}

# Approval workflow chains
APPROVAL_CHAINS = {
    'purchase_request': {
        'small': {  # Under ₹10,000
            'amount_limit': 10000,
            'approvers': ['purchaseTeam', 'projectManager']
        },
        'medium': {  # ₹10,000 - ₹50,000
            'amount_limit': 50000,
            'approvers': ['projectManager']
        },
        'large': {  # Above ₹50,000
            'amount_limit': None,
            'approvers': ['projectManager', 'businessOwner']
        }
    },
    'material_requisition': {
        'production': {
            'approvers': ['factorySupervisor', 'projectManager']
        },
        'site': {
            'approvers': ['siteEngineer', 'projectManager']
        }
    },
    'vendor_quotation': {
        'approvers': ['purchaseTeam', 'projectManager', 'businessOwner']
    },
    'project_approval': {
        'approvers': ['projectManager', 'businessOwner']
    }
}

# Department mapping for workflow roles
ROLE_DEPARTMENTS = {
    'siteSupervisor': 'Operations',
    'mepSupervisor': 'Operations',
    'procurement': 'Procurement',
    'projectManager': 'Management',
    'design': 'Technical',
    'estimation': 'Technical',
    'accounts': 'Finance',
    'technicalDirector': 'Executive'
}

# Workflow flags for approval processes (matching workflow diagram)
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

def get_role_permissions(role_name):
    """Get permissions for a specific role"""
    role_config = ROLE_HIERARCHY.get(role_name.lower(), {})
    return role_config.get('permissions', [])

def get_role_approval_limit(role_name):
    """Get approval limit for a specific role"""
    role_config = ROLE_HIERARCHY.get(role_name.lower(), {})
    return role_config.get('approval_limit', 0)

def get_approval_chain(workflow_type, amount=None):
    """Get the approval chain for a workflow based on amount if applicable"""
    chain = APPROVAL_CHAINS.get(workflow_type, {})
    
    if workflow_type == 'purchase_request' and amount is not None:
        if amount <= 10000:
            return chain.get('small', {}).get('approvers', [])
        elif amount <= 50000:
            return chain.get('medium', {}).get('approvers', [])
        else:
            return chain.get('large', {}).get('approvers', [])
    
    return chain.get('approvers', [])

def get_role_department(role_name):
    """Get department for a specific role"""
    return ROLE_DEPARTMENTS.get(role_name.lower(), 'General')

def can_role_approve(role_name, workflow_type, amount=None):
    """Check if a role can approve a specific workflow"""
    role_config = ROLE_HIERARCHY.get(role_name.lower(), {})
    can_approve_types = role_config.get('can_approve', [])
    
    # Check if role can approve this type
    if 'all' in can_approve_types or workflow_type in can_approve_types:
        # Check amount limit if applicable
        if amount is not None:
            approval_limit = role_config.get('approval_limit')
            if approval_limit is None:  # No limit
                return True
            return amount <= approval_limit
        return True
    
    return False