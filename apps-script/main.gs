/**
 * GNSS PDF Parser - Main Workflow and User Interface
 * Google Apps Script entry point and PDF processing orchestration
 */

// Configuration constants
const SPREADSHEET_ID = '1DKX4jnhUlOvNDPoH0n_Xgu3oJEkRNtSw7EVU8GW1wcM';
const SOURCE_FOLDER_ID = '1pmuRcPnlDns-iW_7kHxWVUAZW9xzGnpP';
const DATA_SHEET_NAME = 'GNSS Parser Data';
const SUMMARY_SHEET_NAME = 'Processing Summary';
const LOG_SHEET_NAME = 'Processing Log';

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
 * Show PDF file selector dialog
 */
function showPDFSelector() {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h3>Select PDF File to Process</h3>
      <p>Choose a GNSS datasheet PDF from Google Drive:</p>
      <div id="file-list">Loading...</div>
      <br>
      <button onclick="processPDF()" id="process-btn" disabled>Process Selected PDF</button>
      <button onclick="google.script.host.close()">Cancel</button>
    </div>
    
    <script>
      let selectedFileId = null;
      
      // Load PDF files from source folder
      google.script.run
        .withSuccessHandler(displayFiles)
        .withFailureHandler(showError)
        .getPDFFilesFromFolder();
      
      function displayFiles(files) {
        const listDiv = document.getElementById('file-list');
        if (files.length === 0) {
          listDiv.innerHTML = '<p>No PDF files found in the source folder.</p>';
          return;
        }
        
        let html = '<select id="file-select" onchange="selectFile()">';
        html += '<option value="">-- Select a PDF file --</option>';
        for (const file of files) {
          html += \`<option value="\${file.id}">\${file.name}</option>\`;
        }
        html += '</select>';
        listDiv.innerHTML = html;
      }
      
      function selectFile() {
        const select = document.getElementById('file-select');
        selectedFileId = select.value;
        document.getElementById('process-btn').disabled = !selectedFileId;
      }
      
      function processPDF() {
        if (!selectedFileId) return;
        
        document.getElementById('process-btn').disabled = true;
        document.getElementById('process-btn').innerHTML = 'Processing...';
        
        google.script.run
          .withSuccessHandler(showResult)
          .withFailureHandler(showError)
          .processSinglePDF(selectedFileId);
      }
      
      function showResult(result) {
        if (result.success) {
          alert(\`PDF processed successfully!\\nConfidence: \${result.confidence}%\\nRow: \${result.rowNumber}\`);
          google.script.host.close();
        } else {
          showError(result.error);
        }
      }
      
      function showError(error) {
        alert('Error: ' + error);
        document.getElementById('process-btn').disabled = false;
        document.getElementById('process-btn').innerHTML = 'Process Selected PDF';
      }
    </script>
  `).setWidth(500).setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'GNSS PDF Parser');
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
 * Process a single PDF file
 */
function processSinglePDF(fileId) {
  try {
    // Get the PDF file
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    
    logProcessingEvent('INFO', `Starting processing of ${fileName}`, fileName);
    
    // Extract text from PDF
    const pdfText = extractTextFromPDF(file);
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('Could not extract text from PDF. File may be image-based or corrupted.');
    }
    
    logProcessingEvent('INFO', `Extracted ${pdfText.length} characters from PDF`, fileName);
    
    // Extract fields
    const extractedFields = EXTRACTORS.extractAllFields(pdfText);
    logProcessingEvent('INFO', `Extracted ${Object.keys(extractedFields).length} fields`, fileName);
    
    // Validate fields
    const validatedFields = VALIDATORS.validateAllFields(extractedFields);
    logProcessingEvent('INFO', `Validated fields, overall confidence: ${validatedFields.overallConfidence}%`, fileName);
    
    // Write to Google Sheets
    const writeResult = FORMATTERS.writeToGoogleSheets(
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
 * Extract text from PDF file
 */
function extractTextFromPDF(file) {
  try {
    // Method 1: Try using built-in PDF parsing (if available)
    const blob = file.getBlob();
    
    // For Google Apps Script, we need to use OCR via Drive API
    // Convert PDF to Google Docs format for text extraction
    const ocrFile = Drive.Files.copy({
      name: `OCR_${file.getName()}`,
      parents: [SOURCE_FOLDER_ID]
    }, file.getId(), {
      ocr: true,
      ocrLanguage: 'en'
    });
    
    // Get the text content
    const doc = DocumentApp.openById(ocrFile.id);
    const text = doc.getBody().getText();
    
    // Clean up the temporary OCR file
    DriveApp.getFileById(ocrFile.id).setTrashed(true);
    
    return text;
    
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    // Fallback: Try alternative extraction method
    try {
      return extractTextFromPDFAlternative(file);
    } catch (fallbackError) {
      console.error('Fallback extraction also failed:', fallbackError);
      throw new Error('Could not extract text from PDF using any available method');
    }
  }
}

/**
 * Alternative PDF text extraction method
 */
function extractTextFromPDFAlternative(file) {
  // This is a placeholder for alternative extraction methods
  // In a real implementation, you might use:
  // - Third-party OCR services
  // - Different Google APIs
  // - External libraries
  
  throw new Error('Alternative extraction method not implemented');
}

/**
 * Batch process all PDFs in the source folder
 */
function batchProcessFolder() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Batch Process Confirmation',
      'This will process all PDF files in the source folder. Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    const files = getPDFFilesFromFolder();
    if (files.length === 0) {
      ui.alert('No PDF files found in the source folder.');
      return;
    }
    
    logProcessingEvent('INFO', `Starting batch processing of ${files.length} files`, 'BATCH');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Show progress
        const progress = Math.round((i / files.length) * 100);
        logProcessingEvent('INFO', `Processing file ${i + 1}/${files.length} (${progress}%): ${file.name}`, 'BATCH');
        
        const result = processSinglePDF(file.id);
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`${file.name}: ${result.error}`);
        }
        
        // Add small delay to avoid API rate limits
        Utilities.sleep(1000);
        
      } catch (error) {
        errorCount++;
        errors.push(`${file.name}: ${error.message}`);
        logProcessingEvent('ERROR', error.message, file.name);
      }
    }
    
    // Show results
    const message = `Batch processing completed!\n\nSuccess: ${successCount}\nErrors: ${errorCount}`;
    
    if (errorCount > 0) {
      const errorDetails = errors.slice(0, 5).join('\n'); // Show first 5 errors
      const fullMessage = message + '\n\nFirst errors:\n' + errorDetails;
      
      if (errors.length > 5) {
        fullMessage += `\n... and ${errors.length - 5} more errors`;
      }
      
      ui.alert('Batch Processing Results', fullMessage, ui.ButtonSet.OK);
    } else {
      ui.alert('Batch Processing Complete', message, ui.ButtonSet.OK);
    }
    
    logProcessingEvent('INFO', `Batch processing completed: ${successCount} success, ${errorCount} errors`, 'BATCH');
    
  } catch (error) {
    console.error('Error in batch processing:', error);
    SpreadsheetApp.getUi().alert('Batch processing failed: ' + error.message);
  }
}

/**
 * Validate existing data in the sheet
 */
function validateExistingData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DATA_SHEET_NAME);
    
    if (!sheet) {
      SpreadsheetApp.getUi().alert('No data sheet found. Process some PDFs first.');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      SpreadsheetApp.getUi().alert('No data to validate. Process some PDFs first.');
      return;
    }
    
    logProcessingEvent('INFO', `Starting validation of ${data.length - 1} rows`, 'VALIDATION');
    
    let validRowCount = 0;
    let invalidRowCount = 0;
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const fileName = row[0]; // PDF filename in first column
      
      // Extract field values from row
      const fieldNames = CONFIG.getFieldNames();
      const extractedFields = {};
      
      for (let j = 0; j < fieldNames.length; j++) {
        const fieldName = fieldNames[j];
        const value = row[j + 1]; // +1 because filename is in column 0
        
        extractedFields[fieldName] = {
          value: value,
          confidence: 80, // Default confidence for existing data
          method: 'existing_data'
        };
      }
      
      // Re-validate the fields
      const validatedFields = VALIDATORS.validateAllFields(extractedFields);
      
      if (validatedFields.overallConfidence >= 70) {
        validRowCount++;
      } else {
        invalidRowCount++;
      }
      
      // Update formatting based on new validation
      FORMATTERS.applyConditionalFormatting(sheet, i + 1, validatedFields);
    }
    
    const message = `Validation completed!\n\nValid rows: ${validRowCount}\nInvalid rows: ${invalidRowCount}`;
    SpreadsheetApp.getUi().alert('Data Validation Results', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
    logProcessingEvent('INFO', `Validation completed: ${validRowCount} valid, ${invalidRowCount} invalid`, 'VALIDATION');
    
  } catch (error) {
    console.error('Error validating existing data:', error);
    SpreadsheetApp.getUi().alert('Validation failed: ' + error.message);
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
      SpreadsheetApp.getUi().alert('No processing log found.');
      return;
    }
    
    // Get last 20 log entries
    const data = logSheet.getDataRange().getValues();
    const recentEntries = data.slice(-20).reverse(); // Show most recent first
    
    let logText = 'Recent Processing Log Entries:\n\n';
    
    for (const entry of recentEntries) {
      const [timestamp, level, message, fileName] = entry;
      logText += `[${timestamp}] ${level}: ${message}`;
      if (fileName) {
        logText += ` (${fileName})`;
      }
      logText += '\n';
    }
    
    const html = HtmlService.createHtmlOutput(`
      <div style="padding: 20px; font-family: monospace; font-size: 12px;">
        <h3>Processing Log</h3>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; max-height: 400px; overflow-y: auto;">${logText}</pre>
        <button onclick="google.script.host.close()">Close</button>
      </div>
    `).setWidth(600).setHeight(500);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Processing Log');
    
  } catch (error) {
    console.error('Error showing processing log:', error);
    SpreadsheetApp.getUi().alert('Could not load processing log: ' + error.message);
  }
}

/**
 * Show setup instructions
 */
function showSetupInstructions() {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>GNSS PDF Parser Setup Instructions</h2>
      
      <h3>Prerequisites</h3>
      <ul>
        <li>Google Drive folder with GNSS PDF datasheets</li>
        <li>Google Sheets spreadsheet for output</li>
        <li>Appropriate permissions for the Apps Script</li>
      </ul>
      
      <h3>Configuration</h3>
      <p>Update these constants in the main.gs file:</p>
      <ul>
        <li><strong>SPREADSHEET_ID:</strong> Your Google Sheets ID</li>
        <li><strong>SOURCE_FOLDER_ID:</strong> Your PDF source folder ID</li>
      </ul>
      
      <h3>Usage</h3>
      <ol>
        <li><strong>Process Single PDF:</strong> Select and process one PDF file</li>
        <li><strong>Batch Process Folder:</strong> Process all PDFs in the source folder</li>
        <li><strong>Validate Data:</strong> Re-validate existing data in the sheet</li>
        <li><strong>Show Processing Log:</strong> View recent processing activities</li>
      </ol>
      
      <h3>Output</h3>
      <p>Results are written to the specified Google Sheets with:</p>
      <ul>
        <li>Color-coded confidence levels (Green: High, Orange: Medium, Red: Low)</li>
        <li>Validation notes for problematic fields</li>
        <li>Processing metadata and error tracking</li>
      </ul>
      
      <h3>Troubleshooting</h3>
      <ul>
        <li>Check the processing log for detailed error messages</li>
        <li>Ensure PDF files are text-based (not scanned images)</li>
        <li>Verify Google Drive folder permissions</li>
        <li>Contact support for extraction issues</li>
      </ul>
      
      <button onclick="google.script.host.close()">Close</button>
    </div>
  `).setWidth(600).setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Setup Instructions');
}

/**
 * Log processing events for debugging and monitoring
 */
function logProcessingEvent(level, message, fileName = '') {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
    
    // Create log sheet if it doesn't exist
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet(LOG_SHEET_NAME);
      
      // Set up headers
      const headers = ['Timestamp', 'Level', 'Message', 'File Name'];
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
    
    // Add log entry
    const timestamp = new Date();
    const logEntry = [timestamp, level, message, fileName];
    
    const lastRow = logSheet.getLastRow();
    logSheet.getRange(lastRow + 1, 1, 1, logEntry.length).setValues([logEntry]);
    
    // Keep only last 1000 entries to prevent sheet from growing too large
    if (lastRow > 1000) {
      logSheet.deleteRows(2, lastRow - 1000);
    }
    
    // Also log to console for debugging
    console.log(`[${level}] ${message} ${fileName ? `(${fileName})` : ''}`);
    
  } catch (error) {
    console.error('Error logging event:', error);
    // Don't throw error to avoid breaking main processing
  }
}

/**
 * Initialize the parser (called manually if needed)
 */
function initializeParser() {
  try {
    // Initialize modules in proper order with error handling
    console.log('Starting parser initialization...');
    
    // 1. Initialize CONFIG
    if (typeof CONFIG === 'undefined' || CONFIG === null) {
      throw new Error('CONFIG module not loaded');
    }
    
    // 2. Test configuration loading
    const fieldNames = CONFIG.getFieldNames();
    console.log(`Configuration loaded: ${fieldNames.length} fields configured`);
    
    // 3. Reinitialize VALIDATORS with proper CONFIG
    if (typeof VALIDATORS !== 'undefined' && VALIDATORS.reinitialize) {
      VALIDATORS.reinitialize();
      console.log('VALIDATORS reinitialized with CONFIG');
    }
    
    // 4. Test extractors
    if (typeof EXTRACTORS === 'undefined' || EXTRACTORS === null) {
      throw new Error('EXTRACTORS module not loaded');
    }
    
    const testText = "Dimensions: 235 × 146 × 14.5 mm\nWeight: 850 g\nAccuracy: 0.6 cm + 0.5 ppm";
    const extracted = EXTRACTORS.extractField('dimensions', testText);
    console.log('Test extraction result:', extracted);
    
    // 5. Test validators
    if (typeof VALIDATORS === 'undefined' || VALIDATORS === null) {
      throw new Error('VALIDATORS module not loaded');
    }
    
    const validated = VALIDATORS.validateField('dimensions', extracted);
    console.log('Test validation result:', validated);
    
    logProcessingEvent('INFO', 'Parser initialization completed successfully', 'INIT');
    
    return {
      success: true,
      message: 'Parser initialized successfully',
      fieldsConfigured: fieldNames.length
    };
    
  } catch (error) {
    console.error('Error initializing parser:', error);
    logProcessingEvent('ERROR', `Initialization failed: ${error.message}`, 'INIT');
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test function for development and debugging
 */
function testParser() {
  try {
    const testText = `
      GNSS Receiver Specifications
      
      Physical Specifications:
      Dimensions: 235 × 146 × 14.5 mm
      Weight: 850 g
      Operating Temperature: -40°C to +85°C
      Storage Temperature: -55°C to +95°C
      IP Rating: IP67
      
      Electrical Specifications:
      Input Voltage: 9–32 VDC
      Power Consumption: 2.5 W
      
      Performance Specifications:
      RTK Accuracy: 0.6 cm + 0.5 ppm horizontal
      Update Rate: 100 Hz
      Latency: <1 ms
      Time Sync: 20 ns RMS to UTC
      
      GNSS Specifications:
      Constellations: GPS (L1/L2/L5), GLONASS (G1/G2), Galileo (E1/E5a/E5b)
      Channels: 544 tracking channels
      
      Connectivity:
      Interfaces: Ethernet (10/100 Mbps), USB, RS232 (2 ports), CAN-FD
      Formats: RTCM v3.x, RINEX v3, NMEA 0183, SBF
      
      Other:
      IMU: 6-axis MEMS IMU included
      Warranty: 2 years return-to-base
      Options: Pro+, L-band, RTK licenses available
    `;
    
    console.log('Starting test extraction...');
    
    // Extract all fields
    const extracted = EXTRACTORS.extractAllFields(testText);
    console.log('Extracted fields:', extracted);
    
    // Validate fields
    const validated = VALIDATORS.validateAllFields(extracted);
    console.log('Validation results:', validated);
    
    // Generate summary
    const summary = VALIDATORS.generateValidationSummary(validated);
    console.log('Validation summary:', summary);
    
    // Generate report
    const report = FORMATTERS.generateTextReport(validated, 'TEST_FILE.pdf', summary);
    console.log('Generated report:\n', report);
    
    logProcessingEvent('INFO', `Test completed: ${validated.overallConfidence}% confidence`, 'TEST');
    
    return {
      success: true,
      extractedFields: Object.keys(extracted).length,
      overallConfidence: validated.overallConfidence,
      validFields: validated.validFieldCount
    };
    
  } catch (error) {
    console.error('Test failed:', error);
    logProcessingEvent('ERROR', `Test failed: ${error.message}`, 'TEST');
    return {
      success: false,
      error: error.message
    };
  }
}
