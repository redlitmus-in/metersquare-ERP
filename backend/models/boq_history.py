from datetime import datetime
from config.db import db

class BOQHistory(db.Model):
    __tablename__ = "boq_history"
    __table_args__ = {'schema': 'public'}

    boq_history_id = db.Column(db.Integer, primary_key=True)
    boq_id = db.Column(db.Integer, nullable=True)
    action_by = db.Column(db.String(255), nullable=True)
    action =  db.Column(db.String(255), nullable=True)
    action_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)
     
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'boq_history_id': self.boq_history_id,
            'boq_id': self.boq_id,
            'action_by': self.action_by,
            'action': self.action,
            'action_date': self.action_date,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }

class BOQSummary(db.Model):
    __tablename__ = "boq_summary"
    __table_args__ = {'schema': 'public'}

    summary_id = db.Column(db.Integer, primary_key=True)
    boq_id = db.Column(db.Integer, nullable=True)
    sub_total = db.Column(db.Float, nullable=True)
    section_id =  db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)
     
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'summary_id': self.summary_id,
            'boq_id': self.boq_id,
            'sub_total': self.sub_total,
            'section_id': self.section_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }
class BOQTerm(db.Model):
    __tablename__ = "boq_terms"
    __table_args__ = {'schema': 'public'}

    boq_term_id = db.Column(db.Integer, primary_key=True)
    boq_id = db.Column(db.Integer, nullable=True)
    clause = db.Column(db.String(255), nullable=True)
    details =  db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)
     
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'boq_term_id': self.boq_term_id,
            'boq_id': self.boq_id,
            'clause': self.clause,
            'details': self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }

        