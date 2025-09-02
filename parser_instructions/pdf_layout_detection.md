# PDF Layout Detection Instructions

## Purpose
Advanced page segmentation and layout analysis for GNSS datasheet parsing.

## Page Segmentation Algorithms

### 1. Header Detection
- Identify document headers with product names and model numbers
- Extract page headers for context (company logos, product families)
- Detect section headers (FEATURES, SPECIFICATIONS, PERFORMANCE)

### 2. Table Recognition
- Detect tabular data structures with clear borders
- Identify column headers and data rows
- Handle multi-row header tables
- Process specification tables with parameter-value pairs

### 3. Two-Column Layout Handling
- Detect side-by-side content layouts
- Identify left/right column boundaries
- Handle text flow across columns
- Preserve reading order for parsing

### 4. Block-Level Segmentation
- Identify text blocks and paragraphs
- Detect bulleted and numbered lists
- Separate technical specifications from marketing content
- Isolate performance data blocks

## Layout Analysis Rules

### Text Block Classification
- **Primary Specs:** Tables with technical parameters
- **Secondary Info:** Descriptive paragraphs and features
- **Marketing Content:** High-level descriptions and benefits
- **Legal/Regulatory:** Certifications and compliance information

### Spatial Relationships
- Maximum label-value distance: 200px horizontal
- Preferred proximity: same line or adjacent lines
- Column association rules for multi-column layouts
- Header-to-content relationship mapping

### Priority Regions
1. **Performance/Environmental sections** (highest priority)
2. **Technical specifications tables**
3. **Feature lists and bullet points**
4. **General description paragraphs** (lowest priority)

## Implementation Guidelines

### Pre-Processing
1. Convert PDF to structured text with coordinate information
2. Identify page boundaries and margins
3. Detect and classify graphical elements
4. Extract text with position metadata

### Processing Pipeline
1. **Page Analysis:** Segment page into logical blocks
2. **Content Classification:** Categorize each block by type
3. **Relationship Mapping:** Establish spatial relationships
4. **Priority Ordering:** Rank blocks by parsing importance

### Error Handling
- Handle rotated or skewed page content
- Manage partially obscured text (watermarks, overlays)
- Process multi-page specifications that span pages
- Deal with inconsistent formatting across documents

## Output Format
Structured representation of page layout with:
- Block coordinates and boundaries
- Content classification labels
- Reading order sequence
- Priority rankings for parser targeting
