from datetime import datetime
from config.db import db
from sqlalchemy.dialects.postgresql import ARRAY


class Project(db.Model):
    __tablename__ = 'project'
    __table_args__ = {'schema': 'public'}  # Explicitly set schema
    
    project_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_name = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.Integer, nullable=True)
    location = db.Column(db.String(255), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(255), nullable=False)
    description = db.Column(ARRAY(db.Integer))  # Store as array of integers
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
            'project_id': self.project_id,
            'project_name': self.project_name,
            'user_id': self.user_id,
            'location': self.location,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'status': self.status,
            'description': self.description,
            'is_deleted': self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }