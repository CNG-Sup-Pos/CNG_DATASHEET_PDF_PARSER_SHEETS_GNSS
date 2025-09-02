# GNSS PDF Parser - Google Apps Script Implementation

## Goal
Extract 18 fields from GNSS PDF datasheets → Google Sheets with confidence scoring

## Files to Create (apps-script/)
- main.gs (orchestration)
- extractors.gs (field extraction) 
- validators.gs (validation + confidence)
- formatters.gs (output formatting)
- config.gs (load patterns from framework)

## Implementation Order
1. Create config.gs - load field_aliases.yaml patterns into JS objects
2. Create extractors.gs - 18 field extraction functions using regex
3. Create validators.gs - validate + score each field (High/Med/Low confidence)
4. Create formatters.gs - write to Google Sheets with color coding
5. Create main.gs - PDF processing workflow + UI menu

## Key Framework Files to Use
- config/field_aliases.yaml (regex patterns)
- config/unit_normalization/*.txt (normalization rules)
- field_settings/validation_rules.json (validation logic)
- field_settings/output_formatting.json (Google Sheets formatting)

## Success Criteria
- All 18 fields extract with confidence scores
- Google Sheets integration with color-coded confidence
- Custom menu: "Process PDF", "Batch Process Folder"
- Error handling and manual review workflow

Done. Start coding.