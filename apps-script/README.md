# GNSS PDF Parser for Google Sheets

A Google Apps Script solution that automatically extracts 18 technical fields from GNSS/RTK receiver datasheet PDFs and writes structured data to Google Sheets with confidence scoring and validation.

## Features

- **18-field extraction**: Dimensions, weight, temperature, voltage, power, IMU, accuracy, latency, frequency, time sync, measurements, IP rating, channels, constellations, interfaces, formats, warranty, firmware options
- **Confidence scoring**: High (85-100%), Medium (70-84%), Low (50-69%), Very Low (<50%)
- **Data validation**: Format checking, range validation, cross-field consistency
- **Google Sheets integration**: Color-coded output, automatic formatting, error logging
- **Batch processing**: Process entire folders of PDF files
- **Manual review workflow**: Flag low-confidence extractions for human verification

## Setup Instructions

### 1. Google Sheets Setup
1. Create a new Google Sheets spreadsheet
2. Note the spreadsheet ID from the URL
3. Ensure the service account has edit permissions

### 2. Google Drive Setup
1. Create a folder for PDF source files
2. Note the folder ID from the URL
3. Upload GNSS datasheet PDFs to this folder

### 3. Apps Script Deployment
1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Replace the default Code.gs with the files from this repository:
   - `config.gs`
   - `extractors.gs` 
   - `validators.gs`
   - `formatters.gs`
   - `main.gs`
4. Update the `appsscript.json` manifest file
5. Update configuration constants in `main.gs`:
   ```javascript
   const SPREADSHEET_ID = 'your-spreadsheet-id';
   const SOURCE_FOLDER_ID = 'your-folder-id';
   ```

### 4. Enable Required Services
1. In Apps Script editor, go to Services
2. Enable Google Drive API
3. Enable Google Sheets API
4. Save and authorize the script

## Usage

### Custom Menu Options
After setup, a "GNSS PDF Parser" menu will appear in your Google Sheets:

- **Process Single PDF**: Select and process one PDF file
- **Batch Process Folder**: Process all PDFs in the source folder  
- **Validate Data**: Re-validate existing data in the sheet
- **Show Processing Log**: View recent processing activities
- **Setup Instructions**: Display help information

### Output Format
Results are written to Google Sheets with:

| Column | Field | Description |
|--------|--------|-------------|
| A | PDF File | Source filename |
| B | Dimensions | L × W × H in mm |
| C | Weight | Mass in grams |
| D | Operating Temp | Temperature range in °C |
| E | Storage Temp | Storage temperature range |
| F | Input Voltage | Voltage range (VDC/VAC) |
| G | Power | Power consumption in W |
| H | IMU | Inertial measurement unit specs |
| I | Accuracy | Position accuracy (cm + ppm) |
| J | Latency | Output latency in ms |
| K | Frequency | Update rate in Hz |
| L | Time Sync | Time synchronization accuracy |
| M | Measurements | Supported measurement types |
| N | IP Rating | Environmental protection rating |
| O | Channels | Number of tracking channels |
| P | Constellations | Supported GNSS constellations |
| Q | Interfaces | Communication interfaces |
| R | Formats | Supported data formats |
| S | Warranty | Warranty period and terms |
| T | Firmware Options | Available software variants |
| U | Confidence | Overall confidence score |

### Confidence Color Coding
- **Green**: High confidence (85-100%) - Reliable extraction
- **Orange**: Medium confidence (70-84%) - Good extraction, minor issues
- **Red**: Low confidence (50-69%) - Requires manual review
- **Gray**: Very low confidence (<50%) - Likely incorrect

## Field Extraction Details

### Physical Specifications
- **Dimensions**: Parses L×W×H format, normalizes units to mm
- **Weight**: Extracts mass values, converts kg to grams
- **Operating Temperature**: Finds temperature ranges for normal operation
- **Storage Temperature**: Identifies storage/shipping temperature limits
- **IP Rating**: Detects environmental protection ratings (IP67, IP68, etc.)

### Electrical Specifications  
- **Input Voltage**: Extracts voltage ranges (VDC/VAC)
- **Power Consumption**: Finds power draw specifications in watts

### Performance Specifications
- **Accuracy**: Parses RTK/DGPS accuracy with ppm components
- **Latency**: Extracts output latency in milliseconds
- **Frequency**: Finds update rates in Hz
- **Time Sync**: Identifies time synchronization accuracy

### GNSS Specifications
- **Channels**: Counts tracking channels
- **Constellations**: Lists supported GNSS systems (GPS, GLONASS, etc.)
- **Measurements**: Identifies supported measurement types (RTK, PPP, DGPS)

### Connectivity & Features
- **Interfaces**: Lists communication ports (Ethernet, USB, Serial, etc.)
- **Formats**: Identifies supported data formats (RTCM, RINEX, NMEA, etc.)
- **IMU**: Detects inertial measurement unit specifications
- **Firmware Options**: Finds available software variants/licenses
- **Warranty**: Extracts warranty terms and duration

## Troubleshooting

### Common Issues

**PDF text extraction fails:**
- Ensure PDFs contain selectable text (not scanned images)
- Check file permissions and accessibility
- Verify PDF is not password-protected

**Low extraction confidence:**
- Review the source PDF for clear specification tables
- Check if field labels match expected aliases
- Consider manual override for problematic fields

**Google Sheets errors:**
- Verify spreadsheet permissions
- Check if target sheet exists
- Ensure sufficient space in the sheet

**Batch processing timeouts:**
- Process smaller batches of files
- Check for very large PDF files
- Monitor Apps Script execution time limits

### Validation Errors

Common validation errors and solutions:

- **Format mismatch**: Value doesn't match expected pattern
- **Range violation**: Numeric value outside reasonable limits  
- **Missing units**: Value lacks required unit specification
- **Cross-field inconsistency**: Related fields have conflicting values

### Performance Optimization

For large-scale processing:
- Process files during off-peak hours
- Use batch processing for multiple files
- Monitor Google Apps Script quotas and limits
- Consider manual review for critical extractions

## Technical Architecture

### Module Structure
- **config.gs**: Field patterns and validation rules
- **extractors.gs**: 18 specialized field extraction functions
- **validators.gs**: Data validation and confidence scoring
- **formatters.gs**: Google Sheets output formatting
- **main.gs**: Workflow orchestration and user interface

### Extraction Pipeline
1. **PDF Text Extraction**: Convert PDF to text using OCR
2. **Field Extraction**: Apply regex patterns and proximity heuristics  
3. **Value Normalization**: Standardize units and formats
4. **Validation**: Check formats, ranges, and consistency
5. **Confidence Scoring**: Calculate reliability metrics
6. **Output Formatting**: Write to Google Sheets with color coding

### Confidence Scoring Algorithm
Confidence scores are calculated using:
- **Source Quality** (40%): Document section priority
- **Association Strength** (30%): Label-value relationship quality
- **Format Validation** (20%): Pattern matching success
- **Context Validation** (10%): Reasonableness checks

## Support

For issues or questions:
1. Check the processing log for detailed error messages
2. Review this documentation for troubleshooting steps
3. Test with known-good PDF files
4. Verify configuration settings

## Version History

**v1.0.0** - Initial release
- Complete 18-field extraction system
- Google Sheets integration
- Confidence scoring and validation
- Batch processing capabilities
- User interface and error handling
