from datetime import datetime
from config.db import db

class Material(db.Model):
    __tablename__ = 'materials'
    __table_args__ = {'schema': 'public'}  # Explicitly set schema
    
    material_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, nullable=True)
    description = db.Column(db.String(255), nullable=False)
    specification = db.Column(db.String(255), nullable=True)
    unit = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(255), nullable=True)
    cost = db.Column(db.Numeric(15, 2), nullable=True)
    priority = db.Column(db.String(255), nullable=True)
    design_reference = db.Column(db.String(255), nullable=True)
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
            'material_id': self.material_id,
            'project_id': self.project_id,
            'description': self.description,
            'specification': self.specification,
            'unit': self.unit,
            'quantity': self.quantity,
            'category': self.category,
            'cost': float(self.cost) if self.cost else None,
            'priority': self.priority,
            'design_reference': self.design_reference,
            'is_deleted': self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }