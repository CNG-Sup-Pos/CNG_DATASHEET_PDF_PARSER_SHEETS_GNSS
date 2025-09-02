# Batch Processing Instructions

## Purpose
Efficient and reliable batch processing workflow for multiple PDF files with progress tracking and error management.

## Batch Processing Architecture

### 1. Workflow Overview
```
PDF Source → File Discovery → Processing Queue → 
Extraction Engine → Validation → Google Sheets → 
Progress Reporting → Error Handling
```

### 2. Processing Pipeline Stages
1. **Discovery Stage:** Scan source directory for PDF files
2. **Queuing Stage:** Prioritize and organize files for processing
3. **Extraction Stage:** Parse individual PDF files
4. **Validation Stage:** Quality check extracted data
5. **Integration Stage:** Write to Google Sheets
6. **Completion Stage:** Update status and cleanup

## File Discovery and Management

### 1. Source Directory Monitoring
**Google Drive Folder Monitoring:**
- Monitor folder: `1pmuRcPnlDns-iW_7kHxWVUAZW9xzGnpP`
- Scan frequency: Every 15 minutes
- File type filtering: *.pdf only
- Size validation: Skip files >50MB
- Modification time tracking to avoid reprocessing

**Local Directory Processing:**
- Support local folder batch processing
- Recursive subdirectory scanning
- File pattern matching (wildcards)
- Date range filtering for selective processing

### 2. File Prioritization
**Processing Order:**
1. **New files** (never processed)
2. **Modified files** (changed since last processing)
3. **Failed files** (retry candidates)
4. **Low confidence files** (manual review pending)

**Size-Based Optimization:**
- Process smaller files first for quick wins
- Queue large files for off-peak processing
- Parallel processing for files <10MB
- Sequential processing for files >10MB

## Processing Queue Management

### 1. Queue Data Structure
```json
{
  "queue_id": "batch_20250102_143022",
  "created_timestamp": "2025-01-02T14:30:22Z",
  "total_files": 25,
  "status": "PROCESSING",
  "files": [
    {
      "file_id": "pdf_001",
      "file_path": "/path/to/file.pdf",
      "file_size": 2150000,
      "priority": 1,
      "status": "PENDING",
      "assigned_worker": null,
      "retry_count": 0,
      "last_attempt": null
    }
  ]
}
```

### 2. Queue Operations
**Queue Management:**
- Add new files to queue with priority assignment
- Remove completed files after successful processing
- Requeue failed files with exponential backoff
- Purge old completed entries after 24 hours

**Load Balancing:**
- Distribute files across available processing workers
- Monitor worker performance and adjust assignments
- Handle worker failures and reassign files
- Scale worker count based on queue size

## Progress Tracking and Reporting

### 1. Real-Time Progress Updates
**Progress Metrics:**
- Files processed / total files
- Current processing rate (files/minute)
- Estimated time to completion
- Success rate and error rate
- Data quality metrics (average confidence)

**Live Status Dashboard:**
```
Batch Processing Status: ACTIVE
Progress: 15/25 files (60%)
Success Rate: 87% (13/15 processed)
Current Rate: 2.3 files/minute
ETA: 4 minutes remaining
Errors: 2 files failed, 1 pending retry
```

### 2. Google Sheets Integration
**Progress Sheet Updates:**
- Write processing status to dedicated progress sheet
- Update timestamp for each file completion
- Record success/failure status with error details
- Maintain processing history for audit trail

**Target Sheet Population:**
- Sheet ID: `1DKX4jnhUlOvNDPoH0n_Xgu3oJEkRNtSw7EVU8GW1wcM`
- Append new rows for successful extractions
- Update existing rows if file was reprocessed
- Maintain data integrity with validation rules

## Parallel Processing Implementation

### 1. Worker Process Management
**Worker Pool Configuration:**
- Default workers: 4 (adjustable based on system resources)
- Maximum workers: 8 (prevent resource exhaustion)
- Worker timeout: 5 minutes per file
- Memory limit: 1GB per worker process

**Task Distribution:**
- Round-robin assignment for balanced load
- Avoid processing same file by multiple workers
- Handle worker crashes and task reassignment
- Monitor worker health and performance

### 2. Resource Management
**Memory Management:**
- Monitor total memory usage across workers
- Garbage collection after each file processing
- Temporary file cleanup between operations
- Resource pooling for PDF parsing libraries

**CPU Optimization:**
- CPU affinity assignment for workers
- Process priority adjustment during peak usage
- Background processing during system idle
- Adaptive throttling based on system load

## Error Handling in Batch Context

### 1. Individual File Failures
**Failure Response:**
- Log detailed error information
- Mark file as failed in queue
- Continue processing remaining files
- Schedule retry with exponential backoff

**Retry Logic:**
- Maximum 3 retry attempts per file
- Increasing delay: 1min, 5min, 15min
- Different processing strategies on retry
- Manual review flag after max retries

### 2. Batch-Level Error Handling
**Critical Failures:**
- System resource exhaustion
- Google Sheets API quota exceeded
- Network connectivity loss
- Authentication failures

**Recovery Procedures:**
- Save current progress state
- Pause processing until issue resolved
- Resume from last successful checkpoint
- Send alert notifications for critical issues

## Performance Optimization

### 1. Caching Strategies
**Template Caching:**
- Cache compiled regex patterns
- Reuse OCR engine instances
- Cache Google Sheets API connections
- Store frequently accessed configuration data

**Result Caching:**
- Cache successful extractions temporarily
- Avoid reprocessing unchanged files
- Store intermediate processing results
- Enable quick reprocessing after configuration changes

### 2. Batch Size Optimization
**Dynamic Batch Sizing:**
- Start with small batches (5-10 files)
- Increase batch size based on success rate
- Reduce batch size if error rate increases
- Adjust based on system performance metrics

## Monitoring and Alerting

### 1. Performance Monitoring
**Key Metrics:**
- Processing throughput (files/hour)
- Average processing time per file
- Memory usage per worker
- Error rate trends
- API usage and quotas

**Alerting Thresholds:**
- Error rate >20% (warning)
- Error rate >50% (critical)
- Processing rate <1 file/minute (warning)
- Memory usage >80% (warning)
- API quota >90% (critical)

### 2. Quality Monitoring
**Data Quality Metrics:**
- Average confidence score per batch
- Fields extraction success rate
- Manual review requirement rate
- Data validation failure rate

**Quality Alerts:**
- Average confidence <70% (warning)
- Extraction success <80% (critical)
- Manual review rate >30% (warning)

## Completion and Cleanup

### 1. Batch Completion Procedures
**Successful Completion:**
- Update all file statuses to COMPLETED
- Generate batch processing summary report
- Archive processing logs and temporary files
- Send completion notification with statistics

**Partial Completion:**
- Report statistics for successfully processed files
- List failed files with error summaries
- Provide retry recommendations
- Schedule automatic reprocessing if appropriate

### 2. Cleanup Operations
**Temporary File Cleanup:**
- Remove PDF processing temporary files
- Clear OCR cache files
- Delete intermediate processing results
- Archive logs older than 30 days

**System Resource Cleanup:**
- Release worker process resources
- Close database connections
- Clear memory caches
- Reset system monitoring counters

## Integration with Manual Review

### 1. Manual Review Queue
**Failed File Handling:**
- Create manual review entries for failed files
- Provide extracted partial data for manual completion
- Enable file resubmission after manual corrections
- Track manual review completion status

### 2. Quality Control Integration
**Low Confidence Extractions:**
- Flag extractions below confidence threshold
- Provide manual verification interface
- Enable batch approval for similar cases
- Learning from manual corrections for future processing
