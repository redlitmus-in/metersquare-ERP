from datetime import datetime
from config.db import db

class PurchaseStatus(db.Model):
    __tablename__ = 'purchase_status'
    __table_args__ = {'schema': 'public'}  # Explicitly set schema
    
    status_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey('public.purchase.purchase_id'), nullable=False)
    sender = db.Column(db.String(50), nullable=False) 
    receiver = db.Column(db.String(50), nullable=False) # 'projectManager', 'estimation', 'technicalDirector', etc.
    role = db.Column(db.String(50), nullable=False)  # The role that is taking action (same as sender for backward compatibility)
    status = db.Column(db.String(50), nullable=False)  # 'pending', 'approved', 'rejected'
    decision_by_user_id = db.Column(db.Integer,nullable=False)
    decision_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    rejection_reason = db.Column(db.String(255), nullable=True)
    reject_category = db.Column(db.String(50), nullable=True)
    comments = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)  # Latest status for this role is active
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)
    
    # Relationship with Purchase
    purchase = db.relationship('Purchase', backref='status_history')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'status_id': self.status_id,
            'purchase_id': self.purchase_id,
            'sender': self.sender,
            'receiver': self.receiver,
            'role': self.role,
            'status': self.status,
            'decision_by_user_id': self.decision_by_user_id,
            'decision_date': self.decision_date.isoformat() if self.decision_date else None,
            'rejection_reason': self.rejection_reason,
            'comments': self.comments,
            'is_active': self.is_active,
            'reject_category': self.reject_category,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'last_modified_at': self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }
    
    @staticmethod
    def get_latest_status_by_role(purchase_id, role):
        """Get the latest status for a purchase by specific role"""
        return PurchaseStatus.query.filter_by(
            purchase_id=purchase_id, 
            sender=role,
            is_active=True
        ).order_by(PurchaseStatus.created_at.desc()).first()
    
    @staticmethod
    def get_absolute_latest_status_by_role(purchase_id, role):
        """Get the absolute latest status for a purchase by specific role, regardless of active status"""
        return PurchaseStatus.query.filter_by(
            purchase_id=purchase_id, 
            sender=role
        ).order_by(PurchaseStatus.created_at.desc()).first()
    
    @staticmethod
    def get_all_role_statuses(purchase_id):
        """Get all active statuses for a purchase by role"""
        return PurchaseStatus.query.filter_by(
            purchase_id=purchase_id, 
            is_active=True
        ).all()
    
    @staticmethod
    def get_status_history(purchase_id):
        """Get all status history for a purchase"""
        return PurchaseStatus.query.filter_by(
            purchase_id=purchase_id
        ).order_by(PurchaseStatus.created_at.desc()).all()
    
    @staticmethod
    def get_latest_status(purchase_id):
        """Get the latest status for a purchase (regardless of sender role)"""
        return PurchaseStatus.query.filter_by(
            purchase_id=purchase_id
        ).order_by(PurchaseStatus.created_at.desc()).first()
    
    @staticmethod
    def create_new_status(purchase_id, sender_role, receiver_role, status, decision_by_user_id, rejection_reason=None, reject_category=None, comments=None, created_by=None):
        """Create a new status entry for a specific role and deactivate previous ones for that role"""
        # Deactivate all previous statuses for this purchase and sender role
        PurchaseStatus.query.filter_by(
            purchase_id=purchase_id, 
            sender=sender_role,
            is_active=True
        ).update({'is_active': False})
        
        # Create new status
        new_status = PurchaseStatus(
            purchase_id=purchase_id,
            sender=sender_role,
            receiver=receiver_role,
            role=sender_role,  # Set role same as sender for backward compatibility
            status=status,
            decision_by_user_id=decision_by_user_id,
            rejection_reason=rejection_reason,
            reject_category=reject_category,
            comments=comments,
            created_by=created_by
        )
        
        db.session.add(new_status)
        return new_status
    
