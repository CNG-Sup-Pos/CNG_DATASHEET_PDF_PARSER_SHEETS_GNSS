# Proximity Heuristics Instructions

## Purpose
Intelligent label-value association using distance calculations and contextual analysis.

## Distance Calculation Methods

### 1. Horizontal Distance Priority
- **Same Line Association:** 0-50px (highest confidence)
- **Near Line Association:** 51-150px (high confidence)
- **Extended Range:** 151-200px (medium confidence)
- **Out of Range:** >200px (low confidence, flag for review)

### 2. Vertical Distance Handling
- **Same Line:** Preferred association method
- **Next Line:** Acceptable if horizontal alignment exists
- **Two Lines Below:** Only if clear contextual connection
- **Multi-Line Values:** Handle spans across 2-3 lines

### 3. Column-Aware Distance
- Detect column boundaries in multi-column layouts
- Calculate intra-column distances separately
- Prevent cross-column false associations
- Handle table cell boundaries as distance barriers

## Label Recognition Patterns

### 1. Standard Label Formats
- **Colon-terminated:** "Weight:", "Dimensions:", "Power:"
- **Parenthetical units:** "Weight (g)", "Voltage (VDC)"
- **Table headers:** Bold or capitalized field names
- **Bullet point labels:** "• Weight", "- Power consumption"

### 2. Contextual Label Detection
- Identify labels within specification tables
- Recognize repeated label patterns across documents
- Handle abbreviated labels ("Temp" for "Temperature")
- Process multi-word labels ("Operating Temperature")

### 3. Value Pattern Recognition
- **Numeric with units:** "850 g", "9-32 VDC", "±2.5 cm"
- **Range values:** "5 to 60°C", "-40°C to +85°C"
- **List values:** "GPS, GLONASS, Galileo"
- **Qualified values:** "Typical: 2.5W, Maximum: 3.2W"

## Association Logic

### 1. Direct Association (Highest Priority)
- Label and value on same line with clear separation
- Table cell relationships with defined boundaries
- Colon or equals sign connecting label to value

### 2. Proximity Association (High Priority)
- Value immediately right of label within distance threshold
- Value on line directly below label with alignment
- Table row-column intersection relationships

### 3. Contextual Association (Medium Priority)
- Value in same text block or section as label
- Pattern-based association from document structure
- Header-to-content relationships in specification sections

### 4. Fallback Association (Low Priority)
- Nearest value within extended search radius
- Section-based association when direct links fail
- Pattern inference from similar document layouts

## Multi-Candidate Resolution

### 1. Distance-Based Ranking
- Score candidates by proximity to label
- Apply distance decay function for scoring
- Prefer horizontal over vertical associations

### 2. Contextual Scoring
- Boost scores for values in Performance/Environmental sections
- Increase confidence for tabular data relationships
- Penalize values in marketing or descriptive content

### 3. Pattern Consistency
- Favor values matching expected format patterns
- Boost confidence for unit-consistent values
- Validate against field-specific regex patterns

### 4. Conflict Resolution
- When multiple candidates exist, prefer closest match
- Use context clues (section headers, table structure)
- Flag ambiguous cases for manual review
- Log all candidates for audit trail

## Implementation Guidelines

### Pre-Processing
1. Extract text with precise coordinate information
2. Identify all potential labels using regex patterns
3. Locate all potential values using field-specific patterns
4. Calculate distance matrix between all label-value pairs

### Processing Pipeline
1. **Direct Association:** Process same-line and table relationships
2. **Proximity Matching:** Apply distance-based scoring
3. **Context Analysis:** Consider section and document structure
4. **Confidence Assignment:** Calculate final association confidence
5. **Conflict Resolution:** Handle multiple candidate scenarios

### Quality Assurance
- Minimum confidence threshold: 70%
- Flag low-confidence associations for review
- Maintain audit log of association decisions
- Enable manual override capability for corrections

## Output Format
For each field extraction:
- Associated label text and coordinates
- Value text and coordinates  
- Distance measurement (pixels)
- Association method used
- Confidence score (0-100)
- Alternative candidates (if any)
