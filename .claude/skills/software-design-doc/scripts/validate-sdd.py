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

    # 1. Check for Mandatory Sections
    mandatory_sections = [
        "1. Introduction",
        "2. Design Overview",
        "3. Design Views",
        "4. Decisions"
    ]
    for section in mandatory_sections:
        if not re.search(rf"^#+\s*{re.escape(section)}", content, re.MULTILINE | re.IGNORECASE):
            errors.append(f"Missing mandatory section: {section}")

    # 2. Extract IDs
    # Pattern matches ID: [NNN] or ID: VIEW-001 or ID: DEC-001
    id_pattern = re.compile(r"-\s*ID:\s*\[?([A-Z0-9-]+)\]?", re.IGNORECASE)
    
    # Split content to distinguish where IDs are defined
    sections = re.split(r"^#+\s*\d+\.\s+", content, flags=re.MULTILINE)
    
    view_ids = set()
    decision_ids = set()
    all_defined_ids = {} # ID -> Line Number (approx)

    # We assume standard section ordering: 1: Intro, 2: Overview, 3: Views, 4: Decisions
    # This is a bit fragile if sections are reordered, so we'll look for headers specifically
    
    view_section_match = re.search(r"(?s)#+\s*3\.\s*Design Views(.*?)(?=#+\s*\d|\Z)", content, re.IGNORECASE)
    if view_section_match:
        for match in id_pattern.finditer(view_section_match.group(1)):
            id_val = match.group(1).upper()
            if id_val in all_defined_ids:
                errors.append(f"Duplicate ID found: {id_val}")
            view_ids.add(id_val)
            all_defined_ids[id_val] = "Section 3"

    decision_section_match = re.search(r"(?s)#+\s*4\.\s*Decisions(.*?)(?=#+\s*\d|\Z)", content, re.IGNORECASE)
    if decision_section_match:
        for match in id_pattern.finditer(decision_section_match.group(1)):
            id_val = match.group(1).upper()
            if id_val in all_defined_ids:
                errors.append(f"Duplicate ID found: {id_val}")
            decision_ids.add(id_val)
            all_defined_ids[id_val] = "Section 4"

    # 3. Check Cross-references
    # Look for patterns like "DEC-001" or "[001]" inside "More Information" or "Context" blocks
    # We specifically look for mentions of IDs that aren't the definition line
    ref_pattern = re.compile(r"(DEC-\d+|VIEW-\d+|\[\d+\])")
    
    # Check Section 3 for references to Section 4
    if view_section_match:
        content_to_check = view_section_match.group(1)
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
    glossary_match = re.search(r"## 1\.3 Definitions.*?\|(.*?)\|", content, re.DOTALL | re.IGNORECASE)
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
