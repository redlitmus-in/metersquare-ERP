AI Workflow Implementation Prompt (No UI)

Implement the Phase-1: Costing, Estimation & Procurement operational workflows exactly as defined below.

No design work. Backend/workflow only (BPMN/state machines, services, APIs, data models, validations, audit trails).

Keep original names for documents, roles, steps, and flags.

Loops for rejections → revisions → re-approval must be implemented.

Acknowledgements and reference inputs must be recorded as workflow events.

Task Completion must be an explicit terminal state for every flow.

Global Roles (use exactly these labels)

Estimation, Procurement, Project Manager, Technical Director, Accounts, Design, Site Supervisor, MEP Supervisor, Factory Supervisor, Store In Charge. Include “PM FLAG”, “COST FLAG”, plain “FLAG”, “QTY/SPEC FLAG”, “QTY/SCOPE FLAG”, “QTY/SPEC/REQ FLAG” as explicit gating states where indicated. 
Documents (must be distinct entities)

Purchase Requisition Form, Vendor Scope of Work Form (BOQ ref), Sub-Contractor Quotation, Material Requisition Form, Material Delivery Note.

1) FLOW CHART – MATERIAL PURCHASES – PROJECT BOUND (exact sequence)

Actors: Site Supervisor / MEP Supervisor, Procurement, Project Manager, Estimation, Technical Director, Accounts, Design.
Flags used: PM FLAG, COST FLAG, generic FLAG, QTY/SPEC FLAG.

Steps (implement as states & transitions):

Purchase Requisition Form is raised (note: two sources exist in the diagram; support creation from Site/MEP Supervisor and from Procurement).

Purchase Requisition Approvals (multi-level):

Qty, Spec & Cost approvals; and Qty & Spec approvals gates.

Gate by QTY/SPEC FLAG and COST FLAG.

Rejections (branch loops):

Qty & Spec rejection → enforce Qty & Spec revisions then resubmit.

Cost rejection → enforce Cost revision then resubmit.

On full approval: Payment Transaction (Accounts).

Acknowledgement of payments (record acknowledgement event(s)).

Design – reference inputs (record reference-input events).

Task Completion (terminal).

2) FLOW CHART – SUBCONTRACTOR / VENDOR – PROJECT BOUND (exact sequence)

Actors: Procurement, Project Manager, Estimation (Vendor List Check & Go), Technical Director, Accounts, Design.
Flags used: PM FLAG, generic FLAG, QTY/SCOPE FLAG.

Steps:

Vendor Scope of Work Form – BOQ ref is prepared.

Sub-Contractor Quotation is received.

Quotation Approvals (multi-level):

Qty, Scope & Cost approvals; and Qty & Scope approvals gates.

Gate by QTY/SCOPE FLAG.

Rejection path: Qty & Scope rejection → Qty & Scope revisions (by Project Manager/Estimation) → resubmit.

On approval: Payment Transaction (Accounts).

Acknowledgement of payments (record).

Design – reference inputs (record).

Task Completion (terminal).

3) FLOW CHART – MATERIAL DISPATCH – PRODUCTION – PROJECT BOUND (exact sequence)

Actors: Factory Supervisor, Procurement / Store In Charge, Project Manager, Estimation, Technical Director, Design.
Flags used: PM FLAG, generic FLAG, QTY/SPEC FLAG.

Steps:

Material Requisition Form is raised (Factory Supervisor).

Material Requisition Approvals: Qty & Spec approvals gate.

Qty & Spec rejection → Qty & Spec revisions → resubmit.

Bulk Qty request is created.

Bulk Qty approvals (Technical Director / Accounts).

Material dispatch for production (issue to shopfloor).

Joinery & Furniture production (record production start event).

Acknowledgement of dispatch (record; appears twice in diagram—support acknowledgement events from relevant parties).

Design – reference inputs (record).

Task Completion (terminal).

4) FLOW CHART – MATERIAL DISPATCH – SITE WORKS – PROJECT BOUND (exact sequence)

Actors: Site/MEP/Factory Supervisor, Procurement, Project Manager, Technical Director, Design.
Flags used: QTY/SPEC/REQ FLAG and FLAG on Technical approval; include Bulk qty dispatch gating.

Steps:

Material Request is raised (Site/MEP Supervisor).

Material Delivery Note is issued.

Material Delivery Note approvals (Project Manager/Procurement).

Qty & Spec rejection → Qty & Spec revisions → resubmit.

Bulk qty dispatch request (when needed).

Bulk qty dispatch approvals (Technical Director).

Site delivery as per approved delivery note (execute dispatch).

Acknowledgement of delivery (record).

Design – reference inputs (record).

Task Completion (terminal).

Implementation Rules

State Machines/BPMN: Model each flow separately with explicit states for every bullet point above, plus rejection→revision→re-approval loops.

Flags as Gates: Implement PM FLAG, COST FLAG, FLAG, QTY/SPEC FLAG, QTY/SCOPE FLAG, QTY/SPEC/REQ FLAG as approval gates that block transitions until resolved. 