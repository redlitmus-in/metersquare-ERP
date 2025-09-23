from datetime import datetime
from config.db import db
from sqlalchemy.dialects.postgresql import JSONB

class BOQ(db.Model):
    __tablename__ = "boq"
    __table_args__ = {'schema': 'public'}

    boq_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, nullable=True)
    title = db.Column(db.String(255), nullable=True)
    raised_by = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(255), default='draft')
    user_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)
     
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'boq_id': self.boq_id,
            'project_id': self.project_id,
            'title': self.title,
            'raised_by': self.raised_by,
            'status': self.status,
            'user_id': self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }

class BOQItem(db.Model):
    __tablename__ = "boq_items"
    __table_args__ = {'schema': 'public'}

    item_id = db.Column(db.Integer, primary_key=True)
    boq_id = db.Column(db.Integer, nullable=True)
    category = db.Column(db.String(255), nullable=True)
    section_id = db.Column(db.Integer, nullable=True)
    item_no =  db.Column(db.String(255), nullable=True)
    quantity = db.Column(db.Integer, nullable=True)
    description =  db.Column(db.String(255), nullable=True)
    unit = db.Column(db.String(20))
    rate = db.Column(db.Float, nullable=True)
    amount = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)
     
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'item_id': self.item_id,
            'boq_id': self.boq_id,
            'section_id': self.section_id,
            'category': self.category,
            'item_no': self.item_no,
            'quantity': self.quantity,
            'description':self.description,
            'unit':self.unit,
            'rate':self.rate,
            'amount':self.amount,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }

class BOQSection(db.Model):
    __tablename__ = "boq_section"
    __table_args__ = {'schema': 'public'}

    section_id = db.Column(db.Integer, primary_key=True)
    section_code = db.Column(db.String(10), nullable=True)
    section_name = db.Column(db.String(255), nullable=True)
    description =  db.Column(db.String(255), nullable=True)
     
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'section_id': self.section_id,
            'section_code': self.section_code,
            'section_name': self.section_name,
            'description':self.description
        }