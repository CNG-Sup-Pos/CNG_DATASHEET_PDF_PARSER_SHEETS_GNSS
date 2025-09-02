# Conflict Resolution Instructions

## Purpose
Systematic resolution of parsing conflicts when multiple candidates exist for field values.

## Conflict Types

### 1. Multiple Value Candidates
- **Same Field, Different Values:** Multiple specifications for same parameter
- **Overlapping Ranges:** Conflicting range specifications
- **Unit Inconsistencies:** Same value with different units
- **Context Variations:** Different values in different document sections

### 2. Label Ambiguity
- **Multiple Labels:** Different labels potentially referring to same field
- **Abbreviated Labels:** Short forms that could match multiple fields
- **Contextual Labels:** Labels that change meaning based on context

### 3. Format Conflicts
- **Mixed Formats:** Same data presented in different formats
- **Precision Variations:** Different levels of precision for same measurement
- **Qualification Differences:** Typical vs. maximum vs. minimum values

## Resolution Priority Matrix

### 1. Section-Based Priority (Highest)
**Priority Order:**
1. **Performance/Environmental Specifications** (Score: 100)
2. **Technical Specifications Tables** (Score: 90)  
3. **Feature Lists and Bullet Points** (Score: 80)
4. **General Description Paragraphs** (Score: 60)
5. **Marketing Content** (Score: 40)
6. **Header/Footer Information** (Score: 20)

### 2. Data Quality Priority (High)
**Quality Indicators:**
- **Tabular Data:** +20 confidence points
- **Precise Numeric Values:** +15 points
- **Standard Units:** +10 points
- **Complete Specifications:** +10 points
- **Clear Label Association:** +10 points

### 3. Proximity Priority (Medium)
- **Direct Association:** +25 points
- **Same Line:** +20 points
- **Adjacent Line:** +15 points
- **Same Block:** +10 points
- **Extended Distance:** -10 points

## Multi-Candidate Selection Logic

### 1. Performance/Environmental Block Preference
When conflicts exist between sections:
```
IF Performance_Section_Value EXISTS:
    SELECT Performance_Section_Value
ELSE IF Environmental_Section_Value EXISTS:
    SELECT Environmental_Section_Value
ELSE:
    APPLY distance_and_quality_scoring()
```

### 2. Qualification-Aware Selection
For qualified values (Typical, Maximum, Minimum):
- **Power Consumption:** Prefer "Typical" over "Maximum"
- **Temperature Range:** Use full operating range if available
- **Accuracy:** Prefer worst-case (conservative) specifications
- **Voltage:** Prefer input range over internal voltages

### 3. Unit Consistency Validation
- Convert all candidates to canonical units
- Flag unit conversion conflicts
- Prefer values with explicit units over assumed units
- Validate against expected value ranges for field type

## Conflict Resolution Algorithms

### 1. Weighted Scoring System
```
Total_Score = (Section_Priority × 0.4) + 
              (Data_Quality × 0.3) + 
              (Proximity_Score × 0.2) + 
              (Format_Consistency × 0.1)
```

### 2. Threshold-Based Selection
- **High Confidence (≥85):** Auto-select highest scoring candidate
- **Medium Confidence (70-84):** Select with manual review flag
- **Low Confidence (<70):** Flag for manual resolution
- **Tie Score (±5 points):** Flag multiple candidates for review

### 3. Context-Aware Rules
**Field-Specific Logic:**
- **Dimensions:** Prefer complete L×W×H over partial measurements
- **Weight:** Prefer device weight over shipping weight
- **Power:** Prefer operating power over standby power
- **Temperature:** Prefer operating range over storage range
- **Accuracy:** Prefer horizontal accuracy for GNSS devices

## Manual Override Integration

### 1. Override Detection
- Check for manual override entries in field_settings
- Validate override format and value reasonableness
- Apply overrides with highest priority (Score: 200)

### 2. Override Validation
- Verify override values against expected formats
- Check unit consistency with field requirements
- Flag unreasonable override values for verification

### 3. Audit Trail Maintenance
- Log all conflict resolution decisions
- Record candidate values and scores
- Track manual overrides and their sources
- Enable rollback capability for corrections

## Error Handling

### 1. Unresolvable Conflicts
When no clear winner emerges:
- Log all candidates with scores
- Set confidence to "CONFLICT_UNRESOLVED"
- Flag field for manual review
- Provide raw text extract for human analysis

### 2. Data Quality Issues
For problematic extractions:
- Validate against expected value ranges
- Check for obvious OCR errors
- Verify unit consistency
- Flag suspicious extractions

### 3. Missing Context
When insufficient information exists:
- Use fallback to lower-priority sections
- Accept lower confidence scores
- Document decision rationale
- Enable future refinement with additional context

## Output Format

### Conflict Resolution Record
For each resolved conflict:
- **Field:** Target field name
- **Selected_Value:** Chosen value with units
- **Selected_Source:** Document section and coordinates
- **Confidence:** Final confidence score (0-100)
- **Alternatives:** List of rejected candidates with scores
- **Resolution_Method:** Algorithm or rule used
- **Manual_Override:** Boolean flag if manually overridden
- **Notes:** Additional context or warnings
