from datetime import datetime
from config.db import db

class Acknowledgement(db.Model):
    __tablename__ = 'acknowledgements'
    __table_args__ = {'schema': 'public'}

    acknowledgement_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('public.payment_transactions.transaction_id'), nullable=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey('public.purchase.purchase_id'), nullable=False)
    acknowledgement_type = db.Column(db.String(50), nullable=False)  # 'payment_received', 'payment_processed', 'completion_confirmed'
    acknowledged_by = db.Column(db.String(255), nullable=False)  # User who acknowledged
    acknowledged_by_role = db.Column(db.String(50), nullable=False)  # Role of the person who acknowledged
    acknowledged_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    acknowledgement_message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='confirmed', nullable=False)  # 'confirmed', 'disputed', 'cancelled'
    dispute_reason = db.Column(db.Text, nullable=True)
    supporting_documents = db.Column(db.Text, nullable=True)  # JSON string of document paths
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(255), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    last_modified_by = db.Column(db.String(255), nullable=True)

    # Relationships
    transaction = db.relationship('PaymentTransaction', backref='acknowledgements')
    purchase = db.relationship('Purchase', backref='acknowledgements')

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'acknowledgement_id': self.acknowledgement_id,
            'transaction_id': self.transaction_id,
            'purchase_id': self.purchase_id,
            'acknowledgement_type': self.acknowledgement_type,
            'acknowledged_by': self.acknowledged_by,
            'acknowledged_by_role': self.acknowledged_by_role,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'acknowledgement_message': self.acknowledgement_message,
            'status': self.status,
            'dispute_reason': self.dispute_reason,
            'supporting_documents': self.supporting_documents,
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'last_modified_at': self.last_modified_at.isoformat() if self.last_modified_at else None,
            'last_modified_by': self.last_modified_by
        }

    @staticmethod
    def get_by_purchase_id(purchase_id):
        """Get all acknowledgements for a purchase"""
        return Acknowledgement.query.filter_by(
            purchase_id=purchase_id,
            is_deleted=False
        ).order_by(Acknowledgement.acknowledged_at.desc()).all()

    @staticmethod
    def get_by_transaction_id(transaction_id):
        """Get all acknowledgements for a transaction"""
        return Acknowledgement.query.filter_by(
            transaction_id=transaction_id,
            is_deleted=False
        ).order_by(Acknowledgement.acknowledged_at.desc()).all()

    @staticmethod
    def get_by_type(acknowledgement_type):
        """Get acknowledgements by type"""
        return Acknowledgement.query.filter_by(
            acknowledgement_type=acknowledgement_type,
            is_deleted=False
        ).order_by(Acknowledgement.acknowledged_at.desc()).all()
