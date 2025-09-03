/**
 * GNSS PDF Parser - Batch Processing Module (MODULARIZED)
 * Batch operations and folder processing
 * Lines: ~235 (within 300-line limit)
 */

/**
 * Get batch processor instance (module pattern)
 */
function getBatchProcessor() {
  return {
    batchProcessFolder: batchProcessFolder,
    validateExistingData: validateExistingData,
    processMultipleFiles: processMultipleFiles,
    getBatchProgress: getBatchProgress
  };
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
      let fullMessage = message + '\n\nFirst errors:\n' + errorDetails;
      
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
 * Process multiple specific files (alternative to full folder batch)
 */
function processMultipleFiles(fileIds) {
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < fileIds.length; i++) {
    const fileId = fileIds[i];
    
    try {
      const result = processSinglePDF(fileId);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Small delay between files
      Utilities.sleep(500);
      
    } catch (error) {
      errorCount++;
      results.push({
        success: false,
        error: error.message,
        fileId: fileId
      });
    }
  }
  
  return {
    results: results,
    summary: {
      total: fileIds.length,
      success: successCount,
      errors: errorCount
    }
  };
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
      getFormatters().applyConditionalFormatting(sheet, i + 1, validatedFields);
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
 * Get batch processing progress information
 */
function getBatchProgress() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
    
    if (!logSheet) {
      return {
        hasProgress: false,
        message: 'No processing log found'
      };
    }
    
    // Get recent batch entries
    const data = logSheet.getDataRange().getValues();
    const batchEntries = data.filter(row => 
      row[3] === 'BATCH' && // fileName column contains 'BATCH'
      row[0] > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
    
    if (batchEntries.length === 0) {
      return {
        hasProgress: false,
        message: 'No recent batch processing found'
      };
    }
    
    const latestEntry = batchEntries[batchEntries.length - 1];
    const progressMatch = latestEntry[2].match(/Processing file (\d+)\/(\d+)/);
    
    if (progressMatch) {
      const current = parseInt(progressMatch[1]);
      const total = parseInt(progressMatch[2]);
      const percentage = Math.round((current / total) * 100);
      
      return {
        hasProgress: true,
        current: current,
        total: total,
        percentage: percentage,
        message: `Processing file ${current} of ${total} (${percentage}%)`
      };
    }
    
    return {
      hasProgress: true,
      message: latestEntry[2]
    };
    
  } catch (error) {
    console.warn('Could not get batch progress:', error);
    return {
      hasProgress: false,
      error: error.message
    };
  }
}

/**
 * Resume interrupted batch processing
 */
function resumeBatchProcessing() {
  try {
    // Get list of all PDFs in folder
    const allFiles = getPDFFilesFromFolder();
    
    // Get list of already processed files from sheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DATA_SHEET_NAME);
    
    let processedFiles = [];
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      processedFiles = data.slice(1).map(row => row[0]); // Skip header, get filenames
    }
    
    // Find unprocessed files
    const unprocessedFiles = allFiles.filter(file => 
      !processedFiles.includes(file.name)
    );
    
    if (unprocessedFiles.length === 0) {
      SpreadsheetApp.getUi().alert('All files have been processed already.');
      return;
    }
    
    // Confirm resume
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Resume Batch Processing',
      `Found ${unprocessedFiles.length} unprocessed files out of ${allFiles.length} total. Resume processing?`,
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    // Process remaining files
    const fileIds = unprocessedFiles.map(file => file.id);
    return processMultipleFiles(fileIds);
    
  } catch (error) {
    console.error('Error resuming batch processing:', error);
    SpreadsheetApp.getUi().alert('Could not resume batch processing: ' + error.message);
  }
}

/**
 * Clean up incomplete processing results
 */
function cleanupIncompleteResults() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DATA_SHEET_NAME);
    
    if (!sheet) {
      return { cleaned: 0, message: 'No data sheet found' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { cleaned: 0, message: 'No data to clean' };
    }
    
    let cleanedRows = 0;
    
    // Check each row for incomplete/invalid data
    for (let i = data.length - 1; i >= 1; i--) { // Go backwards to maintain row indices
      const row = data[i];
      const fileName = row[0];
      
      // Check if row has mostly empty values (indicates incomplete processing)
      const nonEmptyValues = row.slice(1).filter(cell => 
        cell !== null && cell !== undefined && String(cell).trim() !== ''
      );
      
      // If less than 30% of fields have values, consider it incomplete
      const fieldCount = CONFIG.getFieldNames().length;
      const completionRate = nonEmptyValues.length / fieldCount;
      
      if (completionRate < 0.3) {
        sheet.deleteRow(i + 1); // +1 because sheet rows are 1-indexed
        cleanedRows++;
      }
    }
    
    return {
      cleaned: cleanedRows,
      message: `Cleaned ${cleanedRows} incomplete rows`
    };
    
  } catch (error) {
    console.error('Error cleaning incomplete results:', error);
    return { cleaned: 0, error: error.message };
  }
}
