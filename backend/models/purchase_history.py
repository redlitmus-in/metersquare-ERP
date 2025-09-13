from datetime import datetime
from config.db import db
from sqlalchemy.dialects.postgresql import JSONB

class PurchaseHistory(db.Model):
    __tablename__ = 'purchase_history'
    __table_args__ = {'schema': 'public'}  # Explicitly set schema
    
    purchase_history_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey('public.purchase.purchase_id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)  # Latest status for this role is active
    action = db.Column(JSONB, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)
    
    # Relationship with Purchase (use distinct backref to avoid collision with PurchaseStatus)
    purchase = db.relationship('Purchase', backref='purchase_history_entries')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'purchase_history_id': self.purchase_history_id,
            'purchase_id': self.purchase_id,
            'is_active': self.is_active,
            'action': self.action,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'last_modified_at': self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }