from flask import g, request, jsonify
from models.boq_history import *
from models.boq import *
from config.logging import get_logger

from config.db import db

log = get_logger()

# Helper function to generate section-based item numbers
def get_section_code_prefix(category):
    """Map category to section code prefix"""
    category_mapping = {
        'Civil': 'C',
        'Architecture': 'A',
        'Mechanical': 'M',
        'Electrical': 'E',
        'Plumbing': 'P',
        'HVAC': 'H',
        'Interior': 'I',
        'Landscape': 'L',
        'Structure': 'S',
        'MEP': 'ME'
    }
    return category_mapping.get(category, 'G')  # 'G' for General if not found

def generate_item_number(boq_id, category):
    """Generate next item number for a category in format like C1, C2, A1, A2, etc."""
    prefix = get_section_code_prefix(category)

    # Get the highest item number for this category in this BOQ
    existing_items = BOQItem.query.filter_by(boq_id=boq_id).filter(
        BOQItem.item_no.like(f'{prefix}%')
    ).all()

    # Extract numbers and find the highest
    max_number = 0
    for item in existing_items:
        if item.item_no and item.item_no.startswith(prefix):
            try:
                number_part = item.item_no[len(prefix):]
                number = int(number_part)
                max_number = max(max_number, number)
            except ValueError:
                continue

    # Return next number
    return f"{prefix}{max_number + 1}"

def find_or_create_section(section_name, category, current_user):
    """Find existing section or create new one"""
    # First, try to find existing section by name
    existing_section = BOQSection.query.filter_by(section_name=section_name).first()

    if existing_section:
        return existing_section.section_id

    # If not found, create new section
    section_code = get_section_code_prefix(category)
    new_section = BOQSection(
        section_code=section_code,
        section_name=section_name,
        description=f"{category} - {section_name}"
    )
    db.session.add(new_section)
    db.session.flush()  # Get the section_id without committing
    return new_section.section_id

# CREATE - PM raises a new BOQ
def create_boq():
    try:
        current_user = g.user
        data = request.json

        # Create main BOQ record
        new_boq = BOQ(
            project_id=data.get('project_id'),
            title=data.get('title'),
            raised_by=current_user['full_name'],
            user_id=current_user.get('user_id', 1),
            status='draft',
            created_by=current_user['full_name']
        )
        db.session.add(new_boq)
        db.session.flush()  # Get the boq_id without committing
        new_boq_id = new_boq.boq_id

        # Process multiple BOQ items
        items = data.get('items', [])
        total_amount = 0
        section_totals = {}  # Track totals per section

        for item in items:
            # Calculate amount for each item (use calculated amount or provided amount)
            item_amount = item.get('amount', item.get('quantity', 0) * item.get('rate', 0))
            total_amount += item_amount

            # Find or create section
            section_id = find_or_create_section(
                item.get('section'),
                item.get('category'),
                current_user
            )

            # Auto-generate item number based on category
            auto_item_no = generate_item_number(new_boq_id, item.get('category'))

            new_boq_item = BOQItem(
                boq_id=new_boq_id,
                category=item.get('category'),
                section_id=section_id,
                item_no=auto_item_no,
                quantity=item.get('quantity'),
                description=item.get('description'),
                unit=item.get('unit'),
                rate=item.get('rate'),
                amount=item_amount,
                created_by=current_user['full_name']
            )
            db.session.add(new_boq_item)

            # Track section totals
            if section_id not in section_totals:
                section_totals[section_id] = 0
            section_totals[section_id] += item_amount

        # Create BOQ summary for each section
        boq_summary = BOQSummary(
            boq_id=new_boq_id,
            section_id=section_id,
            sub_total=total_amount,
            created_by=current_user['full_name']
        )
        db.session.add(boq_summary)

        # Process multiple BOQ terms
        terms = data.get('terms', [])
        for term in terms:
            boq_term = BOQTerm(
                boq_id=new_boq_id,
                clause=term.get('clause'),
                details=term.get('details'),
                created_by=current_user['full_name']
            )
            db.session.add(boq_term)

        # Commit all changes
        db.session.commit()

        return jsonify({
            "message": "BOQ created successfully",
            "boq_id": new_boq.boq_id,
            "total_amount": total_amount,
            "items_count": len(items),
            "terms_count": len(terms)
        }), 201

    except Exception as e:
        db.session.rollback()
        log.error(f"Error creating BOQ: {str(e)}")
        return jsonify({'error': str(e)}), 500

# READ - View all BOQs
def get_all_boqs():
    boqs = BOQ.query.all()
    return jsonify([boq.to_dict() for boq in boqs])

# READ - View single BOQ by ID
def get_boq(boq_id):
    boq = BOQ.query.get_or_404(boq_id)
    return jsonify(boq.to_dict())

# UPDATE - PM edits a BOQ
def update_boq(boq_id):
    boq = BOQ.query.get_or_404(boq_id)
    data = request.json
    boq.project_id = data.get('project_id', boq.project_id)
    boq.project_name = data.get('project_name', boq.project_name)
    boq.description = data.get('description', boq.description)
    boq.boq_items = data.get('boq_items', boq.boq_items)
    boq.total_estimated_cost = data.get('total_estimated_cost', boq.total_estimated_cost)
    boq.priority = data.get('priority', boq.priority)
    boq.status = data.get('status', boq.status)
    boq.last_modified_by = data.get('last_modified_by', boq.last_modified_by)
    db.session.commit()
    return jsonify({"message": "BOQ updated successfully", "data": boq.to_dict()})

# DELETE - Cancel/Remove BOQ
def delete_boq(boq_id):
    boq = BOQ.query.get_or_404(boq_id)
    db.session.delete(boq)
    db.session.commit()
    return jsonify({"message": "BOQ deleted successfully"})
