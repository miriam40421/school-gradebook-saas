# PRD — Student Certificates SaaS (MVP)

---

# 1. Executive Summary

This product is a SaaS platform for schools to manage grades, evaluations, and generate student certificates (PDF).

The system replaces manual Excel workflows and fragmented tools with a single centralized workflow for:
- Grade entry
- Behavior evaluation
- Teacher collaboration
- Certificate generation
- Version-controlled outputs

The core MVP focus is:
- Fast Excel-like grade entry experience
- Collaboration between homeroom and subject teachers
- Flexible school-specific grading systems (labels)
- Automated certificate generation (PDF)
- Multi-school SaaS architecture

---

# 2. Problem Statement

Schools currently manage certificates using:
- Excel files
- Manual copying of grades
- Fragmented communication between teachers
- High risk of human error
- Time-consuming certificate generation
- Lack of version control

This results in:
- Wasted administrative time
- Inconsistent grading formats
- Errors in official certificates
- High workload during grading periods

---

# 3. Target Users

## Primary Users

### School Administrator / Principal
- Configures grading system
- Defines subjects and behaviors
- Manages users and permissions
- Selects certificate templates
- Locks grading periods

---

### Homeroom Teacher
- Manages full class gradebook
- Completes student evaluations
- Generates certificates for class

---

### Subject Teacher
- Inputs grades only for assigned subjects
- Has restricted access per class and subject

---

# 4. Value Proposition

## For Schools
- Centralized grading and certificate system
- Reduced manual work
- Fewer errors
- Structured workflow for certificate creation

## For Teachers
- Fast Excel-like interface
- Simple grade entry via dropdowns
- Shared workload across teachers
- Reduced administrative burden

---

# 5. Business Goals (MVP)

- Onboard 3–5 schools
- Reduce grading time by at least 50%
- Fully generate certificates inside the system
- Replace Excel-based workflows

---

# 6. Success Metrics

## Product Metrics
- Average grade entry time per student
- Number of missing grades per class
- Time required to generate certificates
- Number of corrections after certificate generation

## Usage Metrics
- Active teachers per school
- Number of generated certificates
- Subject teacher participation rate

## Business Metrics
- Number of active schools
- Retention rate
- Onboarding time per school

---

# 7. Scope Definition

## In Scope (MVP)

### School Configuration
- Subjects
- Behavior categories
- Grading sets (labels)
- Certificate templates (basic)

---

### User Management
- Admin
- Homeroom teacher
- Subject teacher

---

### Gradebook System
- Excel-like grid UI
- Dropdown-based grading (labels only)
- Keyboard navigation
- Copy/paste support
- Drag-fill support
- Autosave
- Undo/redo (basic)

---

### Class Groups
- A subject within a class can be split into sub-groups (e.g., "Math Group A", "Math Group B")
- Each group has its own subject teacher assignment
- Students are assigned to groups by the homeroom teacher
- EditLock scope includes `class_group_id`

---

### Student Management
- Managed by homeroom teacher (not admin) via `/my-students`
- Add / edit / soft-delete students per class
- Bulk import from XLSX or CSV file (any column headers, with or without headers)
- Assign students to class groups
- Admin has read-only view of all students across classes

---

### Certificate Supplements
- Per-student data attached to certificates: absences, lateness, hour-based absences/lateness
- Evaluation text and homeroom/principal signatures
- Per-subject grade label overrides (nikud overrides)
- Editable by homeroom teacher before certificate generation

---

### Hebrew Nikud
- Automatic Hebrew diacritic marks (ניקוד) applied via Dicta API at PDF generation time
- Fields nikudified: student name, class name, term name, evaluation, cohort, yearHebrew, displayDate, subject names, category labels, grade values, comments, signatures
- `certificateProfileName` intentionally not nikudified (proper noun / short label)
- Manual override: if a field already contains nikud characters (Unicode ְ–ֽ), the API call is skipped and the field is used as-is
- Per-field label overrides stored in `certificate_supplements.nikud_overrides`

---

### Certificate Generation
- PDF generation
- Preview mode (HTML and PDF)
- Batch export per class

---

### Permissions
- Role-based access control (RBAC)

---

### Versioning
- Snapshot per certificate generation
- Locked grading periods

---

## Out of Scope (MVP)

- Parent portal
- Student portal
- Mobile application
- AI-generated comments
- Advanced analytics
- Workflow builder
- Fully free-form template editor
- External integrations

---

# 8. MVP Definition

The MVP is successful if a real school can:

1. Configure subjects and grading labels
2. Enter grades quickly in a grid interface
3. Collaborate between teachers
4. Generate certificates as PDF
5. Maintain stable historical records

If any of these fail → product fails.

---

# 9. Roles & Permissions

## Admin
- Full system configuration
- User management
- Template selection
- Lock grading periods

---

## Homeroom Teacher
- Full class access
- Grade editing
- Certificate generation
- Student management: add / edit / soft-delete / import students for their class
- Assign students to class groups
- Edit certificate supplement data (absences, evaluations, signatures)

---

## Subject Teacher
- Edit only assigned subjects
- View only assigned classes

---

# 10. Core User Flows

## School Setup Flow
1. Create school
2. Define subjects
3. Define grading sets (labels)
4. Create classes
5. Assign users
6. Select certificate template

---

## Grade Entry Flow
1. Open class gradebook
2. Navigate grid (Excel-like)
3. Select grades from dropdown
4. Auto-save continuously
5. Validate missing entries
6. Review summary

---

## Certificate Generation Flow
1. Lock grading period
2. Generate certificates
3. Preview PDF
4. Export or print

---

# 11. Core Screens

## Admin Screens
- Dashboard
- School settings (name, certificate profiles and preferences)
- Subjects management
- Grading sets management
- User management (including teacher assignments)
- Classes management (including class groups)
- Certificate template designer
- Certificates view (read-only snapshots across all classes)
- Students read-only view (all students across classes)
- Help / onboarding guide (`/help`)

---

## Teacher Screens
- Gradebook (Excel-like grid) — homeroom and subject teacher views
- My students — student list, class group assignments, certificate supplements
- Certificate generation per class
- Help guide (`/help/teacher`, `/help/homeroom`)

---

## Certificate Screens
- Preview screen (HTML + PDF)
- Batch generation per class
- Export / download center

---

# 12. UX Requirements (Critical)

## Gradebook Experience
Must behave like a high-performance spreadsheet.

Required:
- Keyboard-first navigation
- Tab / Enter movement
- Copy/paste support
- Drag-fill behavior
- Sticky headers
- Fast rendering (virtualized grid)
- Inline dropdown selection
- Autosave feedback

Performance is a critical success factor.

---

# 13. Data Model (Initial)

## schools
- id
- name
- logo
- theme_config

---

## users
- id
- school_id
- role
- name
- email
- password_hash

---

## classes
- id
- school_id
- name
- year

---

## students
- id
- school_id
- class_id
- full_name

---

## subjects
- id
- school_id
- name
- grading_set_id

---

## grading_sets
- id
- school_id
- name
- type (academic | behavior)

---

## grading_set_values
- id
- grading_set_id
- label
- order

---

## grading_terms
- id
- school_id
- name
- is_locked

---

## grade_entries
- id
- school_id
- student_id
- class_id
- subject_id
- term_id
- teacher_id
- value (label string)
- updated_at

---

## class_groups
- id
- school_id
- class_id
- subject_id
- name
- sort_order

---

## student_class_groups
- id
- school_id
- student_id
- class_group_id

---

## teacher_assignments
- id
- school_id
- user_id
- subject_id
- class_id
- class_group_id

---

## certificate_supplements
- id
- school_id
- student_id
- class_id
- term_id
- absences
- lateness
- hour_absences
- hour_lateness
- evaluation
- homeroom_signature
- principal_signature
- grade_comments (JSON)
- nikud_overrides (JSON)

---

## certificate_snapshots
- id
- school_id
- student_id
- class_id
- term_id
- snapshot_json
- pdf_storage_key
- generated_by
- created_at

---

# 14. Multi-Tenant Architecture

- Each record is scoped by `school_id`
- Strict data isolation between schools
- No cross-school data access allowed

---

# 15. Grading System Design

## Core Concept

Each school defines its own grading labels.

Example:

### Math Subject
- Excellent
- Very Good
- Good
- Needs Improvement

### Behavior
- Outstanding
- Satisfactory
- Needs Attention

---

## Rule

Grades are NOT numeric.

Grades are selected labels only.

---

# 16. Versioning Strategy

- Snapshot generated at certificate creation
- Immutable historical records
- Locked grading periods prevent changes
- Minimal audit complexity for MVP

---

# 17. PDF Generation

Pipeline:
1. Fetch grade data
2. Map labels into template
3. Render HTML
4. Convert HTML → PDF
5. Store snapshot + file URL

---

# 18. Performance Requirements

- No per-cell API calls
- Batch updates only
- Virtualized grid rendering
- Debounced autosave (1–2 seconds)
- Cached grading configuration

---

# 19. Key Risks

## 1. Over-flexibility
Risk: system becomes a no-code platform  
Mitigation: strict label-based system

---

## 2. Poor Grid Performance
Risk: teachers reject system  
Mitigation: virtualization + optimized rendering

---

## 3. Permission Complexity
Risk: data leakage between schools/users  
Mitigation: strict RBAC + tenant isolation

---

# 20. Future Enhancements (Not MVP)

- AI-generated teacher comments
- Performance analytics
- Parent portal
- Smart grading suggestions
- School benchmarking
- Integrations with external systems

---

# 21. Product Principle

The system must prioritize:

- Speed
- Simplicity
- Reliability
- Teacher usability

NOT:
- Extreme flexibility
- Complex configuration systems
- Enterprise-level customization