#!/bin/bash

# Repo Cleanup Guardrails Script
# Implements mandatory validation steps for repository documentation cleanup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCS_DIR="docs"
AUDIT_REPORT="docs/REPO_DOC_AUDIT.md"
ALLOWED_ROOT_MDS=("README.md" "CHANGELOG.md" "CONTRIBUTING.md" "SECURITY.md" "LICENSE" "LICENSE.md")
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Counters
KEPT_COUNT=0
UPDATED_COUNT=0
MOVED_COUNT=0
DELETED_COUNT=0

# Arrays for tracking
declare -a DELETED_FILES
declare -a MOVED_FILES
declare -a UPDATED_FILES
declare -a LINK_FIXES

echo -e "${BLUE}=== Repo Cleanup Guardrails Workflow ===${NC}"
echo "Starting comprehensive documentation cleanup with validation..."

# Utility Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a file is in allowed root locations
is_allowed_root_md() {
    local filename=$(basename "$1")
    for allowed in "${ALLOWED_ROOT_MDS[@]}"; do
        if [[ "$filename" == "$allowed" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to scan for file references
scan_file_references() {
    local target_file="$1"
    local target_filename=$(basename "$target_file")
    local target_dirname=$(dirname "$target_file")
    local target_rel_path="$target_file"
    
    echo -e "${BLUE}Scanning for references to: $target_file${NC}"
    
    # Search patterns
    local patterns=(
        "$target_filename"
        "$target_rel_path"
        "($target_filename)"
        "](/$target_rel_path)"
        "](../$target_rel_path)"
        "./$target_filename"
        "$target_rel_path)"
    )
    
    local found_refs=()
    
    for pattern in "${patterns[@]}"; do
        echo "  Searching for pattern: $pattern"
        local refs=$(grep -r -n "$pattern" --include="*.md" --include="*.mdx" . 2>/dev/null || true)
        if [[ -n "$refs" ]]; then
            found_refs+=("$refs")
        fi
    done
    
    if [[ ${#found_refs[@]} -gt 0 ]]; then
        echo -e "${YELLOW}Found references:${NC}"
        printf '%s\n' "${found_refs[@]}"
        return 0
    else
        echo -e "${GREEN}No references found${NC}"
        return 1
    fi
}

# Function to fix file references
fix_file_references() {
    local old_path="$1"
    local new_path="$2"
    local replacement="${3:-}" # Optional replacement file
    
    echo -e "${BLUE}Fixing references from $old_path to $new_path${NC}"
    
    local old_filename=$(basename "$old_path")
    local old_dirname=$(dirname "$old_path")
    local search_patterns=(
        "$old_filename"
        "$old_path"
        "($old_filename)"
        "](/$old_path)"
        "](../$old_path)"
        "./$old_filename"
        "$old_path)"
    )
    
    for pattern in "${search_patterns[@]}"; do
        echo "  Updating pattern: $pattern"
        
        if [[ -n "$replacement" ]]; then
            # Update to replacement file
            sed -i.tmp "s|$pattern|($replacement)|g" $(grep -r -l "$pattern" --include="*.md" --include="*.mdx" . 2>/dev/null || true)
            LINK_FIXES+=("$pattern -> ($replacement)")
        else
            # Remove reference (comment it out)
            sed -i.tmp "s|$pattern|<!-- DELETED: $pattern -->|g" $(grep -r -l "$pattern" --include="*.md" --include="*.mdx" . 2>/dev/null || true)
            LINK_FIXES+=("$pattern -> REMOVED (obsolete)")
        fi
        
        rm -f *.tmp
    done
}

# Function to move markdown file to docs/
move_md_to_docs() {
    local file="$1"
    local filename=$(basename "$file")
    local new_path="$DOCS_DIR/$filename"
    
    log_info "Moving $file to $new_path"
    
    # Check for references before move
    if scan_file_references "$file"; then
        log_warning "References found to $file - will be updated after move"
    fi
    
    # Move the file
    git mv "$file" "$new_path"
    MOVED_COUNT=$((MOVED_COUNT + 1))
    MOVED_FILES+=("$file -> $new_path")
    
    # Fix references after move
    fix_file_references "$file" "$new_path"
    
    log_success "Moved $file to $new_path"
}

# Function to delete markdown file safely
delete_md_file() {
    local file="$1"
    
    log_info "Attempting to delete $file"
    
    # Check for references
    if scan_file_references "$file"; then
        log_error "Cannot delete $file - references exist and no valid replacement provided"
        return 1
    fi
    
    # Safe to delete
    git rm "$file"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    DELETED_FILES+=("$file")
    
    log_success "Deleted $file"
}

# Function to validate markdown links
validate_markdown_links() {
    log_info "Validating markdown links..."
    
    local broken_links=()
    
    # Find all markdown files
    local md_files=$(find . -name "*.md" -o -name "*.mdx" | grep -v node_modules | sort)
    
    for file in $md_files; do
        echo "Checking links in: $file"
        
        # Extract markdown links [text](url)
        local links=$(grep -o '\[[^]]*\]([^)]*)' "$file" || true)
        
        while IFS= read -r link; do
            if [[ -n "$link" ]]; then
                # Extract URL from markdown link
                local url=$(echo "$link" | sed 's/.*\](\([^)]*\)).*/\1/')
                
                # Skip external links and anchors
                if [[ "$url" =~ ^https?:// ]] || [[ "$url" =~ ^# ]] || [[ "$url" =~ ^mailto: ]]; then
                    continue
                fi
                
                # Check if relative file exists
                local file_path="$url"
                if [[ ! -f "$file_path" ]]; then
                    # Try relative to current file directory
                    local dir=$(dirname "$file")
                    local abs_path="$dir/$url"
                    if [[ ! -f "$abs_path" ]]; then
                        broken_links+=("$url -> $file")
                    fi
                fi
            fi
        done <<< "$links"
    done
    
    if [[ ${#broken_links[@]} -gt 0 ]]; then
        log_error "Found broken links:"
        printf '%s\n' "${broken_links[@]}"
        return 1
    else
        log_success "All markdown links are valid"
        return 0
    fi
}

# Function to enforce stray markdown policy
enforce_stray_markdown_policy() {
    log_info "Enforcing stray markdown policy..."
    
    local stray_files=()
    
    # Find all markdown files not in allowed locations
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            local relative_path="${file#./}"
            
            # Skip if in docs/ directory
            if [[ "$relative_path" == docs/* ]]; then
                continue
            fi
            
            # Skip if in allowed root files
            if is_allowed_root_md "$file"; then
                continue
            fi
            
            # This is a stray markdown file
            stray_files+=("$file")
        fi
    done < <(find . -name "*.md" -type f | grep -v node_modules | sort)
    
    if [[ ${#stray_files[@]} -gt 0 ]]; then
        log_warning "Found stray markdown files outside allowed locations:"
        printf '%s\n' "${stray_files[@]}"
        
        # For now, let's move them to docs/ (we could also delete them)
        for file in "${stray_files[@]}"; do
            move_md_to_docs "$file"
        done
        
        return 0
    else
        log_success "No stray markdown files found"
        return 0
    fi
}

# Function to create/update canonical index
create_canonical_index() {
    local index_file="$DOCS_DIR/INDEX.md"
    
    log_info "Creating/updating canonical index: $index_file"
    
    # Get all markdown files in docs/
    local docs_files=$(find "$DOCS_DIR" -name "*.md" -type f | grep -v INDEX.md | sort)
    
    # Create index content
    cat > "$index_file" << 'EOF'
# Documentation Index

## Start Here

- [PRD_V1.md](PRD_V1.md)
- [ARCHITECTURE OVERVIEW](ARCHITECTURE_OVERVIEW.md)
- [SECURITY OVERVIEW](SECURITY_OVERVIEW.md)
- [API OVERVIEW](API_OVERVIEW.md)
- [HELP CENTER MAP](HELP_CENTER_MAP.md)

## Complete Documentation

EOF

    # Add all docs files to index
    for file in $docs_files; do
        local filename=$(basename "$file")
        local title=$(head -n 1 "$file" | sed 's/^# *//' | sed 's/^# *//')
        
        if [[ -n "$title" ]]; then
            echo "- [$title]($filename)" >> "$index_file"
        else
            echo "- [$filename]($filename)" >> "$index_file"
        fi
    done
    
    log_success "Created canonical index at $index_file"
}

# Function to generate final audit report
generate_audit_report() {
    local report_file="$AUDIT_REPORT"
    
    log_info "Generating final audit report: $report_file"
    
    cat > "$report_file" << EOF
# Repository Documentation Audit Report

Generated: $(date)

## Summary

- **Kept**: $KEPT_COUNT
- **Updated**: $UPDATED_COUNT
- **Moved**: $MOVED_COUNT
- **Deleted**: $DELETED_COUNT

## Inventory Table

EOF

    # Add inventory table (this would need to be populated based on actual file analysis)
    echo "| Path | Verdict | Reason | Canonical Replacement |" >> "$report_file"
    echo "|------|---------|--------|----------------------|" >> "$report_file"
    
    # This would be populated based on actual file analysis
    echo "| (Analysis pending) | | | |" >> "$report_file"
    
    cat >> "$report_file" << 'EOF'

## Deleted Files

EOF

    if [[ ${#DELETED_FILES[@]} -gt 0 ]]; then
        printf '%s\n' "${DELETED_FILES[@]}" >> "$report_file"
    else
        echo "None" >> "$report_file"
    fi
    
    cat >> "$report_file" << 'EOF'

## Moves

EOF

    if [[ ${#MOVED_FILES[@]} -gt 0 ]]; then
        printf '%s\n' "${MOVED_FILES[@]}" >> "$report_file"
    else
        echo "None" >> "$report_file"
    fi
    
    cat >> "$report_file" << 'EOF'

## Updates

EOF

    if [[ ${#UPDATED_FILES[@]} -gt 0 ]]; then
        printf '%s\n' "${UPDATED_FILES[@]}" >> "$report_file"
    else
        echo "None" >> "$report_file"
    fi
    
    cat >> "$report_file" << 'EOF'

## Link Fixes

EOF

    if [[ ${#LINK_FIXES[@]} -gt 0 ]]; then
        printf '%s\n' "${LINK_FIXES[@]}" >> "$report_file"
    else
        echo "None" >> "$report_file"
    fi
    
    cat >> "$report_file" << 'EOF'

## Remaining Gaps

Maximum 10 gaps identified:
1. INDEX.md needs "Start Here" section with required documents
2. ARCHITECTURE_OVERVIEW.md needs to be created
3. SECURITY_OVERVIEW.md needs to be created
4. API_OVERVIEW.md needs to be created
5. HELP_CENTER_MAP.md needs to be created
6. PRD_V1.md consolidation needed
7. Multiple implementation files need consolidation
8. Migration documentation needs organization
9. Testing documentation needs consolidation
10. Deployment guides need consolidation

## Proposed New Filenames

- docs/ARCHITECTURE_OVERVIEW.md
- docs/SECURITY_OVERVIEW.md
- docs/API_OVERVIEW.md
- docs/HELP_CENTER_MAP.md
- docs/PRD_V1.md
- docs/DEPLOYMENT_GUIDE.md
- docs/TESTING_GUIDE.md
- docs/INTEGRATION_GUIDE.md

EOF

    log_success "Audit report generated at $report_file"
}

# Main workflow execution
main() {
    log_info "Starting repository cleanup workflow..."
    
    # Step 1: Enforce stray markdown policy
    if ! enforce_stray_markdown_policy; then
        log_error "Stray markdown enforcement failed"
        exit 1
    fi
    
    # Step 2: Validate markdown links
    if ! validate_markdown_links; then
        log_error "Markdown link validation failed"
        exit 1
    fi
    
    # Step 3: Create canonical index
    create_canonical_index
    
    # Step 4: Generate final audit report
    generate_audit_report
    
    # Final summary
    echo ""
    echo -e "${GREEN}=== Repository Cleanup Complete ===${NC}"
    echo "Summary:"
    echo "  - Files moved to docs/: $MOVED_COUNT"
    echo "  - Files deleted: $DELETED_COUNT"
    echo "  - Links fixed: ${#LINK_FIXES[@]}"
    echo "  - Audit report: $AUDIT_REPORT"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Review the audit report: $AUDIT_REPORT"
    echo "2. Check and update docs/INDEX.md with required sections"
    echo "3. Create missing documents listed in the audit"
    echo "4. Run final link validation"
    echo "5. Commit changes with descriptive message"
}

# Execute main workflow
main "$@"