#!/usr/bin/env python3

import re
import sys
import argparse
from pathlib import Path

"""
validate-sdd.py

Validates a Software Design Description (SDD) markdown file for:
1. Unique Identification: Ensures all View and Decision IDs are unique.
2. Cross-referencing: Verifies that references to Decision IDs exist in the Decisions section.
3. Structure: Checks for the presence of mandatory sections.
"""

def validate_sdd(file_path):
    if not Path(file_path).is_file():
        print(f"Error: File '{file_path}' not found.")
        sys.exit(1)

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    warnings = []

    # 1. Check for Mandatory Sections (accept optional section numbering)
    mandatory_section_titles = [
        "Introduction",
        "Design Overview",
        "Design Views",
        "Decisions",
    ]
    def find_section(title):
        return re.search(
            rf"(?im)^#+\s*(?:\d+(?:\.\d+)*\.?\s*)?{re.escape(title)}\s*$",
            content,
        )

    for title in mandatory_section_titles:
        if not find_section(title):
            errors.append(f"Missing mandatory section: {title}")

    # 2. Extract IDs
    # Pattern matches ID: [NNN] or ID: VIEW-001 or ID: DEC-001
    id_pattern = re.compile(r"-\s*ID:\s*\[?([A-Z0-9-]+)\]?", re.IGNORECASE)
    
    # Split content to distinguish where IDs are defined
    sections = re.split(r"^#+\s*\d+\.\s+", content, flags=re.MULTILINE)
    
    view_ids = set()
    decision_ids = set()
    all_defined_ids = {} # ID -> Line Number (approx)

    def extract_section_body(title):
        header_match = find_section(title)
        if not header_match:
            return None

        body_start = header_match.end()
        remaining = content[body_start:]
        next_header = re.search(r"(?m)^#+\s+", remaining)
        body_end = body_start + next_header.start() if next_header else len(content)
        return content[body_start:body_end]

    view_section_body = extract_section_body("Design Views")
    if view_section_body is not None:
        for match in id_pattern.finditer(view_section_body):
            id_val = match.group(1).upper()
            if id_val in all_defined_ids:
                errors.append(f"Duplicate ID found: {id_val}")
            view_ids.add(id_val)
            all_defined_ids[id_val] = "Design Views"

    decision_section_body = extract_section_body("Decisions")
    if decision_section_body is not None:
        for match in id_pattern.finditer(decision_section_body):
            id_val = match.group(1).upper()
            if id_val in all_defined_ids:
                errors.append(f"Duplicate ID found: {id_val}")
            decision_ids.add(id_val)
            all_defined_ids[id_val] = "Decisions"

    # 3. Check Cross-references
    # Look for patterns like "DEC-001" or "[001]" inside "More Information" or "Context" blocks
    # We specifically look for mentions of IDs that aren't the definition line
    ref_pattern = re.compile(r"(DEC-\d+|VIEW-\d+|\[\d+\])")
    
    # Check Section 3 for references to Section 4
    if view_section_body is not None:
        content_to_check = view_section_body
        # Remove the actual ID definitions so we only look at references
        content_to_check = id_pattern.sub("", content_to_check)
        
        found_refs = ref_pattern.findall(content_to_check)
        for ref in found_refs:
            clean_ref = ref.strip("[]").upper()
            if clean_ref not in decision_ids and clean_ref not in view_ids:
                # If it looks like a DEC ID but isn't found
                if clean_ref.startswith("DEC") or clean_ref.isdigit():
                    warnings.append(f"Potential broken reference in Design Views: {ref} (Not found in Decisions)")

    # 4. Check for glossary consistency (Bonus)
    glossary_match = re.search(
        r"(?is)^##\s*(?:\d+(?:\.\d+)*\.?\s*)?Definitions.*?\|(.*?)\|",
        content,
        re.MULTILINE,
    )
    if not glossary_match:
        warnings.append("Glossary (Section 1.3) appears to be empty or missing table structure.")

    # Output Results
    print(f"--- SDD Validation Report: {file_path} ---")
    
    if not errors and not warnings:
        print("✅ No issues found.")
        return 0

    if errors:
        print(f"\n❌ Found {len(errors)} Errors:")
        for err in errors:
            print(f"  - {err}")

    if warnings:
        print(f"\n⚠️ Found {len(warnings)} Warnings:")
        for warn in warnings:
            print(f"  - {warn}")

    print("\nValidation Summary:")
    print(f"  - Design Views defined: {len(view_ids)}")
    print(f"  - Decisions defined:    {len(decision_ids)}")
    
    return 1 if errors else 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate SDD Markdown files.")
    parser.add_argument("file", help="Path to the SDD markdown file")
    args = parser.parse_args()

    sys.exit(validate_sdd(args.file))
