from datetime import datetime
from config.db import db
from sqlalchemy.dialects.postgresql import ARRAY

class Purchase(db.Model):
    __tablename__ = 'purchase'
    __table_args__ = {'schema': 'public'}  # Explicitly set schema
    
    purchase_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, nullable=True)
    requested_by = db.Column(db.String(255), nullable=False)
    site_location = db.Column(db.String(255), nullable=False)
    date = db.Column(db.String(255), nullable=False)
    purpose = db.Column(db.String(255), nullable=False)
    material_ids = db.Column(ARRAY(db.Integer))  # Store as array of integers
    file_path = db.Column(db.String(255), nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)
     
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'purchase_id': self.purchase_id,
            'project_id': self.project_id,
            'requested_by': self.requested_by,
            'site_location': self.site_location,
            'date': self.date,
            'purpose': self.purpose,
            'material_ids': self.material_ids,
            'file_path': self.file_path,
            'is_deleted': self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }