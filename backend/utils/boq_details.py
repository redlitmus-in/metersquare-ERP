from models.boq_history import *
from models.boq import *
from config.logging import get_logger

from config.db import db

log = get_logger()

def get_boq_id(boq_id):
    """Helper function to get complete BOQ data with all related information"""
    try:
        get_boq = BOQ.query.filter_by(boq_id=boq_id).first()
        if not get_boq:
            return None

        boq_data = get_boq.to_dict()

        # Get all BOQ items with section details
        boq_items = BOQItem.query.filter_by(boq_id=get_boq.boq_id).all()
        items_with_sections = []

        for boq_item in boq_items:
            if boq_item:  # Check if item exists
                item_data = boq_item.to_dict()

                # Get section details if section_id exists
                if boq_item.section_id:
                    section = BOQSection.query.get(boq_item.section_id)
                    if section:
                        item_data['section_details'] = section.to_dict()

                items_with_sections.append(item_data)

        # Get BOQ terms (stored as single JSONB entry)
        boq_term = BOQTerm.query.filter_by(boq_id=get_boq.boq_id).first()
        terms_data = []
        if boq_term and boq_term.term:
            # The term field contains the entire array of terms as JSONB
            terms_data = boq_term.term if isinstance(boq_term.term, list) else []

        # Get BOQ summary (now single entry without section_id)
        boq_summary = BOQSummary.query.filter_by(boq_id=get_boq.boq_id).first()
        summaries_data = []
        if boq_summary:
            summaries_data = [boq_summary.to_dict()]

        # Calculate total amount from summary
        total_amount = boq_summary.sub_total if boq_summary and boq_summary.sub_total else 0

        # Add all related data to BOQ
        boq_data.update({
            'items': items_with_sections,
            'terms': terms_data,
            'summaries': summaries_data,
            'total_amount': total_amount,
            'items_count': len(items_with_sections),
            'terms_count': len(terms_data)
        })

        return boq_data

    except Exception as e:
        log.error(f"Error in get_boq_id: {str(e)}")
        return None
