/**
 * GNSS PDF Parser - Debug Functions Module (MODULARIZED)
 * Development and debugging utilities
 * Lines: ~180 (within 300-line limit)
 */

/**
 * Get debug functions instance (module pattern)
 */
function getDebugFunctions() {
  return {
    debugExtraction: debugExtraction,
    debugValidation: debugValidation,
    debugPDFProcessing: debugPDFProcessing,
    generateSystemReport: generateSystemReport,
    clearAllLogs: clearAllLogs,
    exportDebugData: exportDebugData
  };
}

/**
 * Debug specific field extraction
 */
function debugExtraction(fieldName, testText) {
  try {
    console.log(`=== DEBUG EXTRACTION: ${fieldName} ===`);
    console.log('Test text:', testText.substring(0, 200) + '...');
    
    // Test extraction with different methods
    const extractors = getExtractors();
    
    // Method 1: Direct field extraction
    console.log('\n--- Method 1: Direct Field Extraction ---');
    const result1 = extractors.extractField(fieldName, testText);
    console.log('Result:', result1);
    
    // Method 2: Pattern-based extraction
    console.log('\n--- Method 2: Pattern Analysis ---');
    const patterns = extractors.getFieldPatterns(fieldName);
    console.log('Available patterns:', patterns);
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = testText.match(pattern);
      console.log(`Pattern ${i + 1}:`, pattern.source);
      console.log(`Match:`, match ? match[0] : 'No match');
    }
    
    // Method 3: Proximity-based search
    console.log('\n--- Method 3: Proximity Search ---');
    const labels = CONFIG.getFieldConfig(fieldName).labels;
    console.log('Field labels:', labels);
    
    for (const label of labels) {
      const proximity = extractors.findValueNearLabel(testText, label);
      console.log(`Near "${label}":`, proximity);
    }
    
    return {
      fieldName: fieldName,
      directResult: result1,
      patternCount: patterns.length,
      labelCount: labels.length
    };
    
  } catch (error) {
    console.error('Debug extraction failed:', error);
    return { error: error.message };
  }
}

/**
 * Debug validation process
 */
function debugValidation(fieldName, testValue) {
  try {
    console.log(`=== DEBUG VALIDATION: ${fieldName} ===`);
    console.log('Test value:', testValue);
    
    // Get field configuration
    const fieldConfig = CONFIG.getFieldConfig(fieldName);
    console.log('Field config:', fieldConfig);
    
    // Test validation steps
    console.log('\n--- Validation Steps ---');
    
    // Step 1: Value normalization
    const normalized = VALIDATORS.normalizeValue(fieldName, testValue);
    console.log('1. Normalized:', normalized);
    
    // Step 2: Format validation
    const formatValid = VALIDATORS.validateFormat(fieldName, normalized);
    console.log('2. Format valid:', formatValid);
    
    // Step 3: Range validation
    const rangeValid = VALIDATORS.validateRange(fieldName, normalized);
    console.log('3. Range valid:', rangeValid);
    
    // Step 4: Unit validation
    const unitValid = VALIDATORS.validateUnits(fieldName, normalized);
    console.log('4. Unit valid:', unitValid);
    
    // Full validation
    const fullResult = VALIDATORS.validateField(fieldName, { value: testValue });
    console.log('\n--- Full Validation Result ---');
    console.log(fullResult);
    
    return {
      fieldName: fieldName,
      testValue: testValue,
      normalized: normalized,
      steps: {
        format: formatValid,
        range: rangeValid,
        unit: unitValid
      },
      fullResult: fullResult
    };
    
  } catch (error) {
    console.error('Debug validation failed:', error);
    return { error: error.message };
  }
}

/**
 * Debug PDF processing pipeline
 */
function debugPDFProcessing(fileId) {
  try {
    console.log(`=== DEBUG PDF PROCESSING: ${fileId} ===`);
    
    const file = DriveApp.getFileById(fileId);
    console.log('File:', file.getName());
    console.log('Size:', file.getSize(), 'bytes');
    console.log('MIME:', file.getBlob().getContentType());
    
    // Test each extraction method
    const pdfProcessor = getPDFProcessor();
    
    console.log('\n--- Method 1: Drive OCR ---');
    try {
      const text1 = pdfProcessor.extractTextViaDriveOCR(file);
      console.log('Success:', text1 ? text1.length + ' chars' : 'No text');
      console.log('Preview:', text1 ? text1.substring(0, 100) + '...' : 'N/A');
    } catch (error) {
      console.log('Failed:', error.message);
    }
    
    console.log('\n--- Method 2: Direct Blob ---');
    try {
      const text2 = pdfProcessor.extractTextFromBlob(file);
      console.log('Success:', text2 ? text2.length + ' chars' : 'No text');
      console.log('Preview:', text2 ? text2.substring(0, 100) + '...' : 'N/A');
    } catch (error) {
      console.log('Failed:', error.message);
    }
    
    console.log('\n--- Method 3: Copy OCR ---');
    try {
      const text3 = pdfProcessor.extractTextViaCopyOCR(file);
      console.log('Success:', text3 ? text3.length + ' chars' : 'No text');
      console.log('Preview:', text3 ? text3.substring(0, 100) + '...' : 'N/A');
    } catch (error) {
      console.log('Failed:', error.message);
    }
    
    // Full extraction test
    console.log('\n--- Full Extraction Pipeline ---');
    const fullText = pdfProcessor.extractTextFromPDF(file);
    console.log('Final result:', fullText.length, 'characters');
    
    return {
      fileName: file.getName(),
      fileSize: file.getSize(),
      extractedLength: fullText.length,
      preview: fullText.substring(0, 200)
    };
    
  } catch (error) {
    console.error('Debug PDF processing failed:', error);
    return { error: error.message };
  }
}

/**
 * Generate comprehensive system report
 */
function generateSystemReport() {
  try {
    const report = {
      timestamp: new Date(),
      system: {},
      modules: {},
      configuration: {},
      performance: {}
    };
    
    // System info
    report.system.gasVersion = '1.0.0'; // Update as needed
    report.system.spreadsheetId = SPREADSHEET_ID;
    report.system.sourceFolderId = SOURCE_FOLDER_ID;
    
    // Module status
    report.modules.CONFIG = typeof CONFIG !== 'undefined';
    report.modules.EXTRACTORS = typeof getExtractors !== 'undefined';
    report.modules.VALIDATORS = typeof VALIDATORS !== 'undefined';
    report.modules.FORMATTERS = typeof getFormatters !== 'undefined';
    report.modules.PDF_PROCESSOR = typeof getPDFProcessor !== 'undefined';
    
    // Configuration details
    if (report.modules.CONFIG) {
      report.configuration.fieldCount = CONFIG.getFieldNames().length;
      report.configuration.settings = CONFIG.settingsManager.getSettings();
    }
    
    // Performance tests
    const startTime = new Date();
    
    // Test extraction
    try {
      const testResult = getExtractors().extractField('dimensions', 'Dimensions: 100 x 50 mm');
      report.performance.extraction = testResult ? 'PASS' : 'FAIL';
    } catch (error) {
      report.performance.extraction = 'ERROR: ' + error.message;
    }
    
    // Test validation
    try {
      const validated = VALIDATORS.validateField('dimensions', { value: '100 x 50 mm' });
      report.performance.validation = validated.confidence > 0 ? 'PASS' : 'FAIL';
    } catch (error) {
      report.performance.validation = 'ERROR: ' + error.message;
    }
    
    const endTime = new Date();
    report.performance.testDuration = endTime - startTime;
    
    console.log('=== SYSTEM REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
    
  } catch (error) {
    console.error('System report generation failed:', error);
    return { error: error.message };
  }
}

/**
 * Clear all processing logs
 */
function clearAllLogs() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
    
    if (logSheet) {
      logSheet.clear();
      
      // Recreate headers
      const headers = ['Timestamp', 'Level', 'Message', 'File Name'];
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      
      console.log('Processing logs cleared');
      return { success: true, message: 'Logs cleared successfully' };
    } else {
      return { success: false, message: 'No log sheet found' };
    }
    
  } catch (error) {
    console.error('Error clearing logs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export debug data for external analysis
 */
function exportDebugData() {
  try {
    const debugData = {
      timestamp: new Date(),
      systemReport: generateSystemReport(),
      configuration: CONFIG ? CONFIG.settingsManager.getSettings() : null,
      recentLogs: []
    };
    
    // Get recent logs
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
    
    if (logSheet) {
      const data = logSheet.getDataRange().getValues();
      debugData.recentLogs = data.slice(-50); // Last 50 entries
    }
    
    // Create debug output
    const debugText = JSON.stringify(debugData, null, 2);
    console.log('=== DEBUG DATA EXPORT ===');
    console.log(debugText);
    
    return {
      success: true,
      dataSize: debugText.length,
      exportTime: new Date()
    };
    
  } catch (error) {
    console.error('Debug data export failed:', error);
    return { success: false, error: error.message };
  }
}
