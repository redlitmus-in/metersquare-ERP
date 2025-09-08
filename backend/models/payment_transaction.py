from datetime import datetime
from config.db import db
from sqlalchemy.dialects.postgresql import ARRAY

class PaymentTransaction(db.Model):
    __tablename__ = 'payment_transactions'
    __table_args__ = {'schema': 'public'}

    transaction_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey('public.purchase.purchase_id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('public.project.project_id'), nullable=True)
    transaction_type = db.Column(db.String(50), nullable=False)  # 'payment', 'refund', 'adjustment'
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(3), default='AED', nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)  # 'bank_transfer', 'cheque', 'cash', 'card'
    payment_reference = db.Column(db.String(255), nullable=True)  # Bank reference, cheque number, etc.
    vendor_name = db.Column(db.String(255), nullable=True)
    vendor_account_details = db.Column(db.Text, nullable=True)  # JSON string of account details
    status = db.Column(db.String(50), default='pending', nullable=False)  # 'pending', 'processed', 'failed', 'cancelled'
    processed_by = db.Column(db.String(255), nullable=True)
    processed_at = db.Column(db.DateTime, nullable=True)
    failure_reason = db.Column(db.Text, nullable=True)
    approval_required = db.Column(db.Boolean, default=True, nullable=False)
    approved_by = db.Column(db.String(255), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    supporting_documents = db.Column(ARRAY(db.String(255)), nullable=True)  # Array of file paths
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)

    # Relationships
    purchase = db.relationship('Purchase', backref='payment_transactions')
    project = db.relationship('Project', backref='payment_transactions')

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'transaction_id': self.transaction_id,
            'purchase_id': self.purchase_id,
            'project_id': self.project_id,
            'transaction_type': self.transaction_type,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'payment_method': self.payment_method,
            'payment_reference': self.payment_reference,
            'vendor_name': self.vendor_name,
            'vendor_account_details': self.vendor_account_details,
            'status': self.status,
            'processed_by': self.processed_by,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'failure_reason': self.failure_reason,
            'approval_required': self.approval_required,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'notes': self.notes,
            'supporting_documents': self.supporting_documents,
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'last_modified_at': self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }

    @staticmethod
    def get_by_purchase_id(purchase_id):
        """Get all payment transactions for a purchase"""
        return PaymentTransaction.query.filter_by(
            purchase_id=purchase_id, 
            is_deleted=False
        ).order_by(PaymentTransaction.created_at.desc()).all()

    @staticmethod
    def get_pending_transactions():
        """Get all pending payment transactions"""
        return PaymentTransaction.query.filter_by(
            status='pending',
            is_deleted=False
        ).order_by(PaymentTransaction.created_at.desc()).all()

    @staticmethod
    def get_by_status(status):
        """Get payment transactions by status"""
        return PaymentTransaction.query.filter_by(
            status=status,
            is_deleted=False
        ).order_by(PaymentTransaction.created_at.desc()).all()
