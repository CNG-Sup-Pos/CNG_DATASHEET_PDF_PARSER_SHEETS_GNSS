/**
 * GNSS PDF Parser - Settings Manager Module (MODULARIZED)
 * Configuration management and initialization functions
 * Lines: ~270 (within 300-line limit)
 */

/**
 * Get settings manager instance (module pattern)
 */
function getSettingsManager() {
  return {
    initializeParser: initializeParser,
    testParser: testParser,
    testPDFExtraction: testPDFExtraction,
    saveSettings: saveSettings,
    resetParserToDefaults: resetParserToDefaults
  };
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
    if (typeof getExtractors === 'undefined') {
      throw new Error('EXTRACTORS module not loaded');
    }
    
    const testText = "Dimensions: 235 × 146 × 14.5 mm\nWeight: 850 g\nAccuracy: 0.6 cm + 0.5 ppm";
    const extracted = getExtractors().extractField('dimensions', testText);
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
    const extracted = getExtractors().extractAllFields(testText);
    console.log('Extracted fields:', extracted);
    
    // Validate fields
    const validated = VALIDATORS.validateAllFields(extracted);
    console.log('Validation results:', validated);
    
    // Generate summary
    const summary = VALIDATORS.generateValidationSummary(validated);
    console.log('Validation summary:', summary);
    
    // Generate report
    const report = getFormatters().generateTextReport(validated, 'TEST_FILE.pdf', summary);
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

/**
 * Test PDF extraction specifically - use this to debug PDF issues
 */
function testPDFExtraction() {
  try {
    console.log('Starting PDF extraction test...');
    
    // Get the first PDF file from the source folder
    const folder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
    const files = folder.getFilesByType(MimeType.PDF);
    
    if (!files.hasNext()) {
      throw new Error('No PDF files found in source folder for testing');
    }
    
    const testFile = files.next();
    console.log(`Testing with file: ${testFile.getName()}`);
    console.log(`File size: ${testFile.getSize()} bytes`);
    console.log(`MIME type: ${testFile.getBlob().getContentType()}`);
    
    // Test extraction
    const extractedText = getPDFProcessor().extractTextFromPDF(testFile);
    
    console.log(`Extraction successful! Text length: ${extractedText.length} characters`);
    console.log('First 500 characters:');
    console.log(extractedText.substring(0, 500));
    
    // Test if we can find key terms
    const hasSpecs = extractedText.toLowerCase().includes('dimensions') || 
                    extractedText.toLowerCase().includes('weight') ||
                    extractedText.toLowerCase().includes('accuracy') ||
                    extractedText.toLowerCase().includes('voltage') ||
                    extractedText.toLowerCase().includes('temperature');
    
    console.log(`Contains specification keywords: ${hasSpecs}`);
    
    return {
      success: true,
      fileName: testFile.getName(),
      textLength: extractedText.length,
      hasSpecs: hasSpecs,
      preview: extractedText.substring(0, 500)
    };
    
  } catch (error) {
    console.error('PDF extraction test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
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
 * Reset parser to default configuration
 */
function resetParserToDefaults() {
  try {
    // Reset CONFIG to defaults
    CONFIG = new ParserConfig();
    
    // Clear cached instances to force reload with defaults
    EXTRACTORS = null;
    FORMATTERS = null;
    VALIDATORS = null;
    
    // Reinitialize with defaults
    const initResult = initializeParser();
    
    if (initResult.success) {
      logProcessingEvent('INFO', 'Parser reset to defaults successfully', 'RESET');
      return {
        success: true,
        message: 'Parser reset to default configuration'
      };
    } else {
      throw new Error(initResult.error);
    }
    
  } catch (error) {
    console.error('Error resetting parser:', error);
    logProcessingEvent('ERROR', `Reset failed: ${error.message}`, 'RESET');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save parser settings with validation
 */
function saveSettings(settings) {
  try {
    CONFIG.settingsManager.saveSettings(settings);
    // Reload config to pick up new settings
    CONFIG = new ParserConfig();
    // Invalidate cached instances to pick up new config
    EXTRACTORS = null;
    FORMATTERS = null;
    
    logProcessingEvent('INFO', 'Settings saved successfully', 'SETTINGS');
    
    return {
      success: true,
      message: 'Settings saved successfully'
    };
    
  } catch (error) {
    console.error('Settings save error:', error);
    logProcessingEvent('ERROR', `Settings save failed: ${error.message}`, 'SETTINGS');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get comprehensive system status
 */
function getSystemStatus() {
  try {
    const status = {
      timestamp: new Date(),
      modules: {},
      configuration: {},
      performance: {}
    };
    
    // Check module availability
    status.modules.CONFIG = typeof CONFIG !== 'undefined' && CONFIG !== null;
    status.modules.EXTRACTORS = typeof getExtractors !== 'undefined';
    status.modules.VALIDATORS = typeof VALIDATORS !== 'undefined' && VALIDATORS !== null;
    status.modules.FORMATTERS = typeof getFormatters !== 'undefined';
    status.modules.PDF_PROCESSOR = typeof getPDFProcessor !== 'undefined';
    
    // Configuration status
    if (status.modules.CONFIG) {
      status.configuration.fieldsConfigured = CONFIG.getFieldNames().length;
      status.configuration.settings = CONFIG.settingsManager.getSettings();
    }
    
    // Test basic functionality
    if (status.modules.EXTRACTORS) {
      const testResult = getExtractors().extractField('dimensions', 'Dimensions: 100 x 50 x 25 mm');
      status.performance.extractionTest = testResult ? 'PASS' : 'FAIL';
    }
    
    // Check spreadsheet access
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      status.performance.spreadsheetAccess = 'PASS';
      status.performance.spreadsheetName = spreadsheet.getName();
    } catch (error) {
      status.performance.spreadsheetAccess = 'FAIL';
      status.performance.spreadsheetError = error.message;
    }
    
    return status;
    
  } catch (error) {
    return {
      timestamp: new Date(),
      error: error.message,
      status: 'CRITICAL_ERROR'
    };
  }
}
