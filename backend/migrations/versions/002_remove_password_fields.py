"""Remove password, avatar_url, org_uuid and add department field

Revision ID: 002
Revises: 001
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    """
    Remove password, avatar_url, org_uuid columns
    Add department, last_otp_request, otp_attempts columns
    """
    
    # Drop columns that are no longer needed
    op.drop_column('users', 'password')
    op.drop_column('users', 'avatar_url') 
    op.drop_column('users', 'org_uuid')
    
    # Add new columns for OTP-based auth and department
    op.add_column('users', sa.Column('department', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('last_otp_request', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('otp_attempts', sa.Integer(), nullable=True, default=0))
    
    # Create index on department for faster queries
    op.create_index(op.f('ix_users_department'), 'users', ['department'], unique=False)
    
    print("✅ Database schema updated for OTP-only authentication")
    print("   - Removed: password, avatar_url, org_uuid")
    print("   - Added: department, last_otp_request, otp_attempts")


def downgrade():
    """
    Revert changes - add back removed columns and remove new ones
    """
    
    # Remove new columns
    op.drop_index(op.f('ix_users_department'), table_name='users')
    op.drop_column('users', 'otp_attempts')
    op.drop_column('users', 'last_otp_request')
    op.drop_column('users', 'department')
    
    # Add back removed columns
    op.add_column('users', sa.Column('org_uuid', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('password', sa.String(255), nullable=False, server_default='temp_password'))
    
    print("⚠️ Database schema reverted to password-based authentication")
    print("   Note: Default password 'temp_password' set for all users")