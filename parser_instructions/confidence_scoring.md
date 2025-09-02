# Confidence Scoring Instructions

## Purpose
Systematic confidence assessment for parsed field values to ensure data quality and enable automated quality control.

## Confidence Scoring Framework

### Base Confidence Levels
- **High Confidence (85-100):** Direct extraction with strong validation
- **Medium Confidence (70-84):** Good extraction with minor validation issues  
- **Low Confidence (50-69):** Weak extraction requiring manual review
- **Very Low Confidence (0-49):** Poor extraction, likely incorrect

## Scoring Components

### 1. Source Quality (40% weight)
**Document Section Priority:**
- **Performance/Environmental Specs:** +40 points (official specifications)
- **Technical Specifications Table:** +35 points (structured data)
- **Feature Lists:** +30 points (organized information)
- **General Descriptions:** +20 points (narrative context)
- **Marketing Content:** +10 points (promotional material)
- **Headers/Footers:** +5 points (metadata only)

### 2. Association Strength (30% weight)
**Label-Value Relationship:**
- **Direct Table Cell:** +30 points (clear structure)
- **Same Line with Separator:** +25 points (colon, equals, dash)
- **Adjacent Line with Alignment:** +20 points (consistent formatting)
- **Same Text Block:** +15 points (contextual grouping)
- **Proximity-Based:** +10 points (distance calculation)
- **Inferred Association:** +5 points (pattern matching)

### 3. Format Validation (20% weight)
**Pattern Matching:**
- **Perfect Regex Match:** +20 points (exact format compliance)
- **Partial Pattern Match:** +15 points (core format correct)
- **Unit Recognition:** +10 points (appropriate units present)
- **Numeric Validation:** +8 points (valid numeric format)
- **Text Pattern Match:** +5 points (expected text structure)
- **No Pattern Match:** -10 points (format concerns)

### 4. Context Validation (10% weight)
**Reasonableness Checks:**
- **Within Expected Range:** +10 points (value makes sense)
- **Unit Consistency:** +8 points (units match field type)
- **Cross-Field Validation:** +5 points (consistent with related fields)
- **Industry Standard Compliance:** +3 points (typical for device type)
- **Outlier Detection:** -5 points (unusually high/low values)
- **Impossible Values:** -20 points (physically impossible)

## Field-Specific Confidence Rules

### 1. Numeric Fields (Dimensions, Weight, Power, etc.)
**High Confidence Indicators:**
- Explicit units present and correct
- Tabular data with clear labels
- Values within expected device ranges
- Multiple confirming instances in document

**Confidence Penalties:**
- Missing or ambiguous units (-15 points)
- Values outside typical ranges (-10 points)
- OCR artifacts in numeric values (-20 points)
- Contradictory values elsewhere (-15 points)

### 2. List Fields (Interfaces, Formats, Constellations)
**High Confidence Indicators:**
- Comma-separated or bulleted lists
- Standard terminology usage
- Complete enumeration present
- Clear section context

**Confidence Penalties:**
- Incomplete lists (-10 points)
- Non-standard terminology (-8 points)
- Mixed with narrative text (-12 points)
- Ambiguous abbreviations (-15 points)

### 3. Range Fields (Temperature, Voltage, Accuracy)
**High Confidence Indicators:**
- Complete range specification (min-max)
- Consistent units throughout range
- Standard format patterns
- Environmental context present

**Confidence Penalties:**
- Incomplete ranges (-15 points)
- Unit inconsistencies (-20 points)
- Overlapping conflicting ranges (-25 points)
- Missing operating vs. storage distinction (-10 points)

## Confidence Adjustment Rules

### 1. Multi-Source Confirmation
When same value found in multiple locations:
- **2 Sources:** +10 confidence points
- **3+ Sources:** +15 confidence points
- **Conflicting Sources:** -20 confidence points

### 2. Cross-Field Validation
Consistency checks between related fields:
- **Power vs. Voltage consistency:** ±5 points
- **Dimensions vs. Weight reasonableness:** ±8 points
- **Temperature ranges logical ordering:** ±10 points
- **Interface capabilities vs. formats:** ±5 points

### 3. Document Quality Factors
Overall document assessment impact:
- **High-Quality PDF:** +5 points (clear, professional)
- **Standard Layout:** +3 points (follows common patterns)
- **Poor OCR Quality:** -15 points (recognition errors)
- **Inconsistent Formatting:** -8 points (layout problems)

## Threshold-Based Actions

### 1. Automated Processing (≥85% confidence)
- Accept value without manual review
- Include in final output with confidence notation
- Log extraction details for audit
- Continue processing other fields

### 2. Flagged Processing (70-84% confidence)
- Accept value with manual review flag
- Include confidence warning in output
- Log extraction alternatives for comparison
- Enable easy manual override

### 3. Manual Review Required (50-69% confidence)
- Flag field for mandatory human review
- Provide extracted value as suggestion only
- Include all candidate values and scores
- Require explicit manual confirmation

### 4. Automatic Rejection (<50% confidence)
- Reject extracted value as unreliable
- Flag field as "EXTRACTION_FAILED"
- Log attempted extraction for debugging
- Set field to manual entry required

## Quality Assurance Integration

### 1. Confidence Distribution Monitoring
Track confidence score patterns:
- Target: 80% of fields at ≥85% confidence
- Warning: >20% of fields at <70% confidence
- Alert: >10% of fields at <50% confidence

### 2. Field-Specific Confidence Tracking
Monitor extraction success by field type:
- Identify consistently problematic fields
- Adjust extraction patterns based on performance
- Refine confidence scoring for improved accuracy

### 3. Document-Level Quality Assessment
Overall extraction quality metrics:
- Average confidence across all fields
- Distribution of confidence levels
- Manual review rate
- Override frequency

## Output Format

### Confidence Record
For each extracted field:
```json
{
  "field_name": "dimensions",
  "extracted_value": "95 × 95 × 58.5 mm",
  "confidence_score": 92,
  "confidence_level": "HIGH",
  "source_section": "Technical Specifications",
  "extraction_method": "table_cell_direct",
  "validation_checks": {
    "format_match": true,
    "unit_validation": true,
    "range_check": true,
    "cross_field_consistent": true
  },
  "alternatives": [],
  "manual_review_required": false,
  "notes": "Perfect table extraction with standard format"
}
```
