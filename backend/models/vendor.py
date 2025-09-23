from datetime import datetime
from config.db import db
from sqlalchemy.dialects.postgresql import JSONB

class Vendor(db.Model):
    __tablename__ = 'vendor'
    __table_args__ = {'schema': 'public'}

    vendor_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    vendor_name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(255), nullable=True)
    contact_person_name = db.Column(db.String(255))
    email = db.Column(db.String(255), unique=True)
    phone_code = db.Column(db.String(15))
    phone = db.Column(db.String(50))
    street_address = db.Column(db.String(15))
    state = db.Column(db.String(15))
    city = db.Column(db.String(255))
    country = db.Column(db.String(255))
    pin_code = db.Column(db.String(255))
    gst_number = db.Column(db.String(50))
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
            'vendor_id': self.vendor_id,
            'vendor_name': self.vendor_name,
            'category': self.category,
            'contact_person_name': self.contact_person_name,
            'email': self.email,
            'phone_code': self.phone_code,
            'phone': self.phone,
            'street_address': self.street_address,
            'state': self.state,
            'city': self.city,
            'country': self.country,
            'pin_code': self.pin_code,
            'gst_number': self.gst_number,
            'is_deleted': self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }