from datetime import datetime
from config.db import db

class Approval(db.Model):
    __tablename__ = 'approvals'

    approval_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey('public.purchase.purchase_id'), nullable=False)
    reviewer_role = db.Column(db.String(255), nullable=False)  # e.g., 'procurementOfficer'
    status = db.Column(db.String(50), nullable=False)  # e.g., 'pending', 'approved', 'rejected'
    comments = db.Column(db.Text, nullable=True)
    reviewed_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_by = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'approval_id': self.approval_id,
            'reviewer_role': self.reviewer_role,
            'status': self.status,
            'comments': self.comments,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewed_by': self.reviewed_by,
            'purchase_id': self.purchase_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }
