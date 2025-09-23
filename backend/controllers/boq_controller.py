from flask import g, request, jsonify
from utils.boq_details import get_boq_id
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
    return f"{prefix}{max_number + 1}"

def find_or_create_section(section_name, category, current_user):
    """Find existing section or create new one"""
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
            sub_total=total_amount,
            created_by=current_user['full_name']
        )
        db.session.add(boq_summary)

        # Process multiple BOQ terms
        terms = data.get('terms', [])
        boq_term = BOQTerm(
            boq_id=new_boq_id,
            term = terms,
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
# READ - View all BOQs with complete details
def get_all_boqs():
    try:
        # Get all BOQ records
        boqs = BOQ.query.all()

        if not boqs:
            return jsonify({
                "message": "No BOQs found",
                "count": 0,
                "data": []
            }), 200

        complete_boqs = []

        for boq in boqs:
            if boq and boq.boq_id:  # Ensure BOQ exists and has ID
                boq_details = get_boq_id(boq.boq_id)
                if boq_details:
                    complete_boqs.append(boq_details)

        return jsonify({
            "message": f"BOQs retrieved successfully",
            "count": len(complete_boqs),
            "total_boqs_in_db": len(boqs),
            "data": complete_boqs
        }), 200

    except Exception as e:
        log.error(f"Error retrieving BOQs: {str(e)}")
        return jsonify({
            'error': 'Failed to retrieve BOQs',
            'details': str(e)
        }), 500

# READ - View single BOQ by ID with complete details
def get_boq(boq_id):
    try:
        complete_boq_data = get_boq_id(boq_id)
        if not complete_boq_data:
            return jsonify({"error": "BOQ not found"}), 404

        return jsonify({
            "message": "BOQ retrieved successfully",
            "data": complete_boq_data
        }), 200

    except Exception as e:
        log.error(f"Error retrieving BOQ {boq_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

# UPDATE - PM edits a BOQ with all related data
def update_boq(boq_id):
    try:
        current_user = g.user
        boq = BOQ.query.get_or_404(boq_id)
        data = request.json
        # Update main BOQ fields
        boq.project_id = data.get('project_id', boq.project_id)
        boq.title = data.get('title', boq.title)
        boq.raised_by = data.get('raised_by', boq.raised_by)
        boq.status = data.get('status', boq.status)
        boq.last_modified_by = current_user['full_name']
        # Update BOQ items if provided
        if 'items' in data:
            items = data.get('items', [])
            total_amount = 0
            # Track which item_ids are in the update payload
            updated_item_ids = []
            for item in items:
                # Calculate amount for each item
                item_amount = item.get('amount', item.get('quantity', 0) * item.get('rate', 0))
                total_amount += item_amount
                # Find or create section
                section_id = find_or_create_section(
                    item.get('section'),
                    item.get('category'),
                    current_user
                )

                if 'item_id' in item:
                    # Update existing item
                    existing_item = BOQItem.query.get(item['item_id'])
                    if existing_item and existing_item.boq_id == boq_id:
                        existing_item.category = item.get('category', existing_item.category)
                        existing_item.section_id = section_id
                        existing_item.quantity = item.get('quantity', existing_item.quantity)
                        existing_item.description = item.get('description', existing_item.description)
                        existing_item.unit = item.get('unit', existing_item.unit)
                        existing_item.rate = item.get('rate', existing_item.rate)
                        existing_item.amount = item_amount
                        existing_item.last_modified_by = current_user['full_name']
                        updated_item_ids.append(item['item_id'])
                else:
                    # Create new item
                    auto_item_no = generate_item_number(boq_id, item.get('category'))
                    new_boq_item = BOQItem(
                        boq_id=boq_id,
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
                    db.session.flush()  # Get the new item_id
                    updated_item_ids.append(new_boq_item.item_id)
            # Remove items that are not in the update payload
            BOQItem.query.filter(
                BOQItem.boq_id == boq_id,
                ~BOQItem.item_id.in_(updated_item_ids) if updated_item_ids else True
            ).delete(synchronize_session=False)
            # Update BOQ summary (single entry now)
            boq_summary = BOQSummary.query.filter_by(boq_id=boq_id).first()
            if boq_summary:
                # Update existing summary
                boq_summary.sub_total = total_amount
                boq_summary.last_modified_by = current_user['full_name']
            else:
                # Create new summary if doesn't exist
                boq_summary = BOQSummary(
                    boq_id=boq_id,
                    sub_total=total_amount,
                    created_by=current_user['full_name']
                )
                db.session.add(boq_summary)
        # Update BOQ terms if provided (stored as single JSONB entry)
        if 'terms' in data:
            terms = data.get('terms', [])
            # Update existing term record or create new one
            boq_term = BOQTerm.query.filter_by(boq_id=boq_id).first()
            if boq_term:
                # Update existing term
                boq_term.term = terms
                boq_term.last_modified_by = current_user['full_name']
            else:
                # Create new term if doesn't exist
                boq_term = BOQTerm(
                    boq_id=boq_id,
                    term=terms,
                    created_by=current_user['full_name']
                )
                db.session.add(boq_term)
        # Commit all changes
        db.session.commit()
        return jsonify({
            "message": "BOQ updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error updating BOQ {boq_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

# DELETE - Cancel/Remove BOQ
def delete_boq(boq_id):
    boq = BOQ.query.get_or_404(boq_id)
    db.session.delete(boq)
    db.session.commit()
    return jsonify({"message": "BOQ deleted successfully"})
