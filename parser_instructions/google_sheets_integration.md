# Google Sheets Integration Instructions

## Purpose
Comprehensive integration with Google Sheets API for automated data writing, formatting, and real-time updates.

## Google Sheets Configuration

### 1. Target Sheet Details
**Primary Data Sheet:**
- **Sheet ID:** `1DKX4jnhUlOvNDPoH0n_Xgu3oJEkRNtSw7EVU8GW1wcM`
- **Sheet Name:** "GNSS Parser Data"
- **Write Range:** A:T (columns A through T for 18 fields + metadata)

**Source Monitoring:**
- **Drive Folder ID:** `1pmuRcPnlDns-iW_7kHxWVUAZW9xzGnpP`
- **Folder Purpose:** PDF file input monitoring
- **Access Level:** Read/Write for service account

### 2. Authentication Setup
**Service Account Configuration:**
```json
{
  "type": "service_account",
  "project_id": "gnss-parser-project",
  "private_key_id": "[SERVICE_ACCOUNT_KEY_ID]",
  "private_key": "[SERVICE_ACCOUNT_PRIVATE_KEY]",
  "client_email": "[SERVICE_ACCOUNT_EMAIL]",
  "client_id": "[SERVICE_ACCOUNT_CLIENT_ID]",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

**Required API Scopes:**
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.readonly`

## Sheet Structure and Format

### 1. Column Mapping (A-T)
```
A: File_Name           (Source PDF filename)
B: Processing_Date     (Timestamp of processing)
C: Dimensions          (L×W×H format)
D: Weight              (Value with units)
E: Operating_Temp      (Range format)
F: Storage_Temp        (Range format)
G: Input_Voltage       (Range with units)
H: Power_Consumption   (Value with units)
I: IMU                 (Specifications)
J: Accuracy            (Value with confidence)
K: Latency             (Timing specification)
L: Frequency           (Supported frequencies)
M: IP_Rating           (Protection level)
N: Channels            (Number or range)
O: Constellations      (Supported systems)
P: Interfaces          (Connectivity options)
Q: Formats             (Data formats)
R: Warranty            (Terms and duration)
S: Confidence_Score    (Average field confidence)
T: Manual_Override     (User corrections)
```

### 2. Data Formatting Rules
**Header Row (Row 1):**
- Bold formatting
- Background color: Light blue (#E1F5FE)
- Font: Arial 12pt
- Text alignment: Center
- Freeze row for scrolling

**Data Rows (Row 2+):**
- Font: Arial 11pt
- Alternating row colors: White and light gray (#F5F5F5)
- Text alignment: Left for text, Right for numbers
- Auto-resize columns to content

**Special Formatting:**
- High confidence values (≥85): Green background (#E8F5E8)
- Medium confidence values (70-84): Yellow background (#FFF3CD)
- Low confidence values (<70): Red background (#F8D7DA)
- Manual override cells: Blue background (#D4EDDA)

## API Integration Implementation

### 1. Connection Management
**Authentication Flow:**
```python
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

def authenticate_google_sheets():
    credentials = Credentials.from_service_account_file(
        'path/to/service-account-key.json',
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    return build('sheets', 'v4', credentials=credentials)
```

**Connection Pooling:**
- Maintain persistent connection for batch operations
- Implement connection retry logic with exponential backoff
- Handle authentication token refresh automatically
- Monitor API quota usage and implement throttling

### 2. Rate Limiting and Quotas
**API Limits:**
- **Read requests:** 100 requests/100 seconds per user
- **Write requests:** 100 requests/100 seconds per user
- **Daily quota:** 25,000 requests per day

**Rate Limiting Strategy:**
- Batch write operations (up to 1000 rows per request)
- Implement request queuing with 1-second delays
- Monitor quota usage and adjust batch sizes
- Implement exponential backoff for quota exceeded errors

## Data Writing Operations

### 1. New Data Insertion
**Append Row Operation:**
```python
def append_extraction_data(service, sheet_id, extraction_data):
    values = [
        extraction_data['file_name'],
        extraction_data['processing_date'],
        extraction_data['dimensions'],
        # ... all 18 fields
        extraction_data['confidence_score'],
        extraction_data['manual_override']
    ]
    
    body = {
        'values': [values]
    }
    
    result = service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range='A:T',
        valueInputOption='USER_ENTERED',
        body=body
    ).execute()
    
    return result
```

**Batch Insert for Multiple Files:**
- Collect extraction results from batch processing
- Group into chunks of 100 rows maximum
- Execute batch append operations
- Handle partial failures and retry individually

### 2. Data Update Operations
**Update Existing Row:**
```python
def update_extraction_data(service, sheet_id, row_number, field_updates):
    # Find existing row by filename
    range_name = f'A{row_number}:T{row_number}'
    
    # Update specific cells
    for field, value in field_updates.items():
        column = FIELD_COLUMN_MAP[field]
        cell_range = f'{column}{row_number}'
        
        body = {
            'values': [[value]]
        }
        
        service.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range=cell_range,
            valueInputOption='USER_ENTERED',
            body=body
        ).execute()
```

### 3. Duplicate Prevention
**File Processing Tracking:**
- Check existing filenames before processing
- Update existing row if file was reprocessed
- Maintain processing timestamp for audit
- Handle filename collisions with versioning

## Data Validation and Quality Control

### 1. Pre-Write Validation
**Data Format Validation:**
- Verify all required fields are present
- Validate data types and formats
- Check for special characters that might break formatting
- Ensure confidence scores are within valid range (0-100)

**Data Sanitization:**
- Remove or escape special characters
- Normalize text encoding (UTF-8)
- Trim whitespace and standardize formats
- Convert numeric values to consistent formats

### 2. Post-Write Verification
**Write Confirmation:**
- Verify successful write operation response
- Check row count increase matches expected
- Validate written data by reading back sample rows
- Log successful writes for audit trail

**Error Detection:**
- Monitor for write failures and API errors
- Detect data corruption or formatting issues
- Validate cell formatting was applied correctly
- Check for missing or truncated data

## Real-Time Updates and Monitoring

### 1. Progress Tracking Sheet
**Separate Progress Sheet:**
- Sheet name: "Processing Progress"
- Real-time updates during batch processing
- Current file being processed
- Success/failure counts
- Processing rate and ETA

**Progress Data Structure:**
```
A: Batch_ID
B: Start_Time
C: Current_File
D: Files_Processed
E: Total_Files
F: Success_Count
G: Error_Count
H: Processing_Rate
I: ETA
J: Status
```

### 2. Live Dashboard Updates
**Status Updates:**
- Update progress every 10 seconds during processing
- Include current processing step and file name
- Show real-time success and error rates
- Display estimated completion time

**Error Notifications:**
- Write errors immediately to error log sheet
- Include error details and suggested actions
- Flag critical errors for immediate attention
- Provide retry recommendations

## Formatting and Presentation

### 1. Conditional Formatting Rules
**Confidence-Based Coloring:**
```javascript
// Google Sheets conditional formatting rules
{
  ranges: [{ sheetId: 0, startRowIndex: 1, startColumnIndex: 18, endColumnIndex: 19 }],
  booleanRule: {
    condition: { type: 'NUMBER_GREATER_THAN_EQ', values: [{ userEnteredValue: '85' }] },
    format: { backgroundColor: { red: 0.9, green: 1.0, blue: 0.9 } }
  }
}
```

**Data Validation Rules:**
- Dropdown lists for standard field values
- Range validation for numeric fields
- Date format validation for timestamps
- Text length limits for long text fields

### 2. Chart and Summary Integration
**Automatic Charts:**
- Processing statistics dashboard
- Confidence score distribution
- Field extraction success rates
- Error trend analysis

**Summary Calculations:**
- Total files processed
- Average confidence scores
- Most common field values
- Processing performance metrics

## Error Handling and Recovery

### 1. API Error Management
**Common Error Scenarios:**
- Quota exceeded errors
- Network connectivity issues
- Authentication failures
- Invalid data format errors

**Recovery Strategies:**
- Implement exponential backoff for retries
- Cache data locally during outages
- Provide offline processing mode
- Queue operations for later execution

### 2. Data Integrity Protection
**Backup Strategies:**
- Create backup copies before major updates
- Maintain local cache of written data
- Enable rollback capabilities for failed operations
- Regular integrity checks and validation

**Conflict Resolution:**
- Handle concurrent write conflicts
- Implement optimistic locking for updates
- Detect and resolve data inconsistencies
- Provide manual override capabilities

## Testing and Validation

### 1. Integration Testing
**Test Scenarios:**
- Single file processing and writing
- Batch processing with mixed success/failure
- API quota limit testing
- Network failure and recovery testing
- Authentication refresh testing

### 2. Performance Testing
**Load Testing:**
- Large batch processing (100+ files)
- Concurrent processing performance
- API rate limit compliance
- Memory usage during sustained operations

**Stress Testing:**
- Maximum batch size handling
- Error recovery under load
- Long-running operation stability
- Resource cleanup after failures
