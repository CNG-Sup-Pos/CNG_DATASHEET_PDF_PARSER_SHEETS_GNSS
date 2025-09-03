/**
 * GNSS PDF Parser - Main Workflow and User Interface (MODULARIZED)
 * Core orchestration and menu system
 * Lines: ~236 (within 300-line limit)
 */

// Configuration constants
var SPREADSHEET_ID = '1DKX4jnhUlOvNDPoH0n_Xgu3oJEkRNtSw7EVU8GW1wcM';
var SOURCE_FOLDER_ID = '1pmuRcPnlDns-iW_7kHxWVUAZW9xzGnpP';
var DATA_SHEET_NAME = 'GNSS Parser Data';
var SUMMARY_SHEET_NAME = 'Processing Summary';
var LOG_SHEET_NAME = 'Processing Log';

/**
 * Main entry point - called when script is triggered
 */
function onOpen() {
  // Initialize modules first
  initializeModules();
  
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('GNSS PDF Parser')
    .addItem('Process Single PDF', 'showPDFSelector')
    .addItem('Batch Process Folder', 'batchProcessFolder')
    .addSeparator()
    .addItem('Validate Data', 'validateExistingData')
    .addItem('Show Processing Log', 'showProcessingLog')
    .addSeparator()
    .addItem('Configure Settings', 'showConfigDialog')
    .addItem('Advanced Settings', 'showAdvancedConfigDialog')
    .addItem('Setup Instructions', 'showSetupInstructions')
    .addToUi();
}

/**
 * Initialize all modules in proper order
 * Call this function first before using any parser functionality
 */
function initializeModules() {
  try {
    console.log('Initializing modules...');
    
    // Force CONFIG initialization
    if (typeof CONFIG !== 'undefined' && CONFIG.getFieldNames) {
      console.log('CONFIG module available');
    } else {
      console.warn('CONFIG module not properly loaded');
    }
    
    // Force VALIDATORS reinitialization
    if (typeof VALIDATORS !== 'undefined') {
      if (VALIDATORS.reinitialize) {
        VALIDATORS.reinitialize();
        console.log('VALIDATORS reinitialized');
      } else {
        console.warn('VALIDATORS missing reinitialize method');
      }
    } else {
      console.warn('VALIDATORS module not loaded');
    }
    
    console.log('Module initialization complete');
    return true;
  } catch (error) {
    console.error('Module initialization failed:', error);
    return false;
  }
}

/**
 * Process a single PDF file - core workflow orchestration
 */
function processSinglePDF(fileId) {
  try {
    // Get the PDF file
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    
    logProcessingEvent('INFO', `Starting processing of ${fileName}`, fileName);
    
    // Extract text from PDF using PDF processor module
    const pdfText = getPDFProcessor().extractTextFromPDF(file);
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('Could not extract text from PDF. File may be image-based or corrupted.');
    }
    
    logProcessingEvent('INFO', `Extracted ${pdfText.length} characters from PDF`, fileName);
    
    // Extract fields using field extractors
    const extractedFields = getExtractors().extractAllFields(pdfText);
    logProcessingEvent('INFO', `Extracted ${Object.keys(extractedFields).length} fields`, fileName);
    
    // Validate fields using validators
    const validatedFields = VALIDATORS.validateAllFields(extractedFields);
    logProcessingEvent('INFO', `Validated fields, overall confidence: ${validatedFields.overallConfidence}%`, fileName);
    
    // Write to Google Sheets using formatters
    const writeResult = getFormatters().writeToGoogleSheets(
      validatedFields, 
      fileName, 
      SPREADSHEET_ID, 
      DATA_SHEET_NAME
    );
    
    if (!writeResult.success) {
      throw new Error(`Failed to write to Google Sheets: ${writeResult.error}`);
    }
    
    logProcessingEvent('SUCCESS', `Processing completed successfully`, fileName);
    
    // Generate validation summary
    const validationSummary = VALIDATORS.generateValidationSummary(validatedFields);
    
    return {
      success: true,
      confidence: validatedFields.overallConfidence,
      rowNumber: writeResult.rowNumber,
      validFields: validatedFields.validFieldCount,
      totalFields: validatedFields.totalFields,
      needsReview: validationSummary.reviewRequired,
      sheetUrl: writeResult.sheetUrl
    };
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    logProcessingEvent('ERROR', error.message, fileId);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get PDF files from the source folder
 */
function getPDFFilesFromFolder() {
  try {
    const folder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
    const files = folder.getFilesByType(MimeType.PDF);
    const pdfFiles = [];
    
    while (files.hasNext()) {
      const file = files.next();
      pdfFiles.push({
        id: file.getId(),
        name: file.getName(),
        size: file.getSize(),
        lastModified: file.getLastUpdated()
      });
    }
    
    // Sort by last modified (newest first)
    pdfFiles.sort((a, b) => b.lastModified - a.lastModified);
    
    return pdfFiles;
  } catch (error) {
    console.error('Error getting PDF files:', error);
    throw new Error('Could not access PDF folder. Check folder permissions.');
  }
}

/**
 * Validate existing data in spreadsheet
 */
function validateExistingData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dataSheet = spreadsheet.getSheetByName(DATA_SHEET_NAME);
    
    if (!dataSheet) {
      throw new Error(`Sheet "${DATA_SHEET_NAME}" not found`);
    }
    
    // Get data range
    const dataRange = dataSheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      SpreadsheetApp.getUi().alert('No data to validate', 'The data sheet appears to be empty.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Use batch processor for validation
    const validationResults = getBatchProcessor().validateDataRange(values);
    
    // Show results
    const ui = SpreadsheetApp.getUi();
    const summary = `Validation Complete:\n\n` +
                   `Total Rows: ${validationResults.totalRows}\n` +
                   `Valid Rows: ${validationResults.validRows}\n` +
                   `Rows with Issues: ${validationResults.issueRows}\n` +
                   `Average Confidence: ${validationResults.avgConfidence}%`;
    
    ui.alert('Validation Results', summary, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('Error validating data:', error);
    SpreadsheetApp.getUi().alert('Error', `Failed to validate data: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Show processing log
 */
function showProcessingLog() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
    
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet(LOG_SHEET_NAME);
      logSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Level', 'Message', 'File']]);
      logSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    
    // Activate the log sheet
    spreadsheet.setActiveSheet(logSheet);
    
    SpreadsheetApp.getUi().alert('Processing Log', 'The processing log sheet is now active. Review recent processing events and any errors.', SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('Error showing log:', error);
    SpreadsheetApp.getUi().alert('Error', `Failed to show processing log: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Show setup instructions
 */
function showSetupInstructions() {
  const instructions = `
GNSS PDF Parser - Setup Instructions

1. FOLDER SETUP:
   - Create a Google Drive folder for your GNSS PDF datasheets
   - Copy the folder ID from the URL and update SOURCE_FOLDER_ID in main.gs

2. SPREADSHEET SETUP:
   - This Google Sheets file will store the extracted data
   - The script will automatically create the necessary sheets

3. PERMISSIONS:
   - Grant necessary permissions when prompted
   - Ensure the script can access Google Drive and Sheets

4. USAGE:
   - Use "Process Single PDF" for individual files
   - Use "Batch Process Folder" for multiple files
   - Review the Processing Log for any issues

5. CONFIGURATION:
   - Use "Configure Settings" for basic options
   - Use "Advanced Settings" for field priority and extraction rules

For support, check the README.md file in the Apps Script project.
  `;
  
  SpreadsheetApp.getUi().alert('Setup Instructions', instructions, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Log processing events with timestamp
 */
function logProcessingEvent(level, message, fileName = '') {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
    
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet(LOG_SHEET_NAME);
      logSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Level', 'Message', 'File']]);
      logSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    
    const timestamp = new Date();
    const newRow = [timestamp, level, message, fileName];
    
    logSheet.appendRow(newRow);
    
    // Apply formatting based on level
    const lastRow = logSheet.getLastRow();
    const levelCell = logSheet.getRange(lastRow, 2);
    
    switch (level) {
      case 'ERROR':
        levelCell.setBackground('#ffebee').setFontColor('#c62828');
        break;
      case 'SUCCESS':
        levelCell.setBackground('#e8f5e8').setFontColor('#2e7d32');
        break;
      case 'WARNING':
        levelCell.setBackground('#fff3e0').setFontColor('#ef6c00');
        break;
      default: // INFO
        levelCell.setBackground('#e3f2fd').setFontColor('#1565c0');
    }
    
    // Keep only the last 1000 log entries
    if (lastRow > 1001) {
      logSheet.deleteRows(2, lastRow - 1001);
    }
    
  } catch (error) {
    console.error('Error logging event:', error);
  }
}
