/**
 * Sheet Formatters Module
 * Handles Google Sheets integration, formatting, and visual presentation
 */

class SheetFormatters {
  constructor() {
    this.config = null;
    this.sheetConfig = null;
  }

  /**
   * Get configuration with lazy loading
   */
  getConfig() {
    if (!this.config) {
      try {
        this.config = CONFIG;
        this.sheetConfig = this.config.outputFormatting?.googleSheets || this.getDefaultSheetConfig();
      } catch (error) {
        console.warn('CONFIG not available, using fallback');
        this.config = this.createFallbackConfig();
        this.sheetConfig = this.getDefaultSheetConfig();
      }
    }
    return this.config;
  }

  /**
   * Get sheet configuration
   */
  getSheetConfig() {
    this.getConfig(); // Ensure config is loaded
    return this.sheetConfig;
  }

  /**
   * Create fallback configuration
   */
  createFallbackConfig() {
    return {
      getFieldNames: () => [
        'dimensions', 'weight', 'operating_temperature', 'storage_temperature',
        'input_voltage', 'power_consumption', 'imu', 'accuracy', 'latency',
        'frequency', 'time_sync', 'measurement_types', 'ip_rating', 'channels',
        'constellations', 'interfaces', 'formats', 'warranty', 'firmware_options',
        'product_description'
      ]
    };
  }

  /**
   * Get default sheet configuration
   */
  getDefaultSheetConfig() {
    return {
      headers: [
        'Dimensions', 'Weight', 'Operating Temp', 'Storage Temp', 'Input Voltage',
        'Power', 'IMU', 'Accuracy', 'Latency', 'Frequency', 'Time Sync',
        'Measurements', 'IP Rating', 'Channels', 'Constellations', 'Interfaces',
        'Formats', 'Warranty', 'Firmware Options', 'Product Description', 'Confidence'
      ],
      confidenceColors: {
        high: '#4CAF50',      // Green (85-100%)
        medium: '#FF9800',    // Orange (70-84%)
        low: '#F44336',       // Red (50-69%)
        veryLow: '#9E9E9E'    // Gray (<50%)
      }
    };
  }

  /**
   * Write validation results to Google Sheets
   */
  writeToGoogleSheets(validatedFields, pdfFileName, spreadsheetId, sheetName = 'GNSS Parser Data') {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      let sheet = spreadsheet.getSheetByName(sheetName);
      
      // Create sheet if it doesn't exist
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        this.setupSheetHeaders(sheet);
      }

      // Get data row from output formatters
      const outputFormatters = this.getOutputFormatters();
      const dataRow = outputFormatters.prepareDataRow(validatedFields, pdfFileName);
      
      // Find next empty row
      const lastRow = sheet.getLastRow();
      const targetRow = lastRow + 1;
      
      // Write data
      const range = sheet.getRange(targetRow, 1, 1, dataRow.length);
      range.setValues([dataRow]);
      
      // Apply formatting
      this.applyConditionalFormatting(sheet, targetRow, validatedFields);
      this.applyBasicFormatting(sheet, targetRow);
      
      // Auto-resize columns if this is a new sheet
      if (lastRow === 0) {
        this.autoResizeColumns(sheet);
      }
      
      return {
        success: true,
        rowNumber: targetRow,
        sheetUrl: spreadsheet.getUrl()
      };
      
    } catch (error) {
      console.error('Error writing to Google Sheets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get output formatters instance
   */
  getOutputFormatters() {
    try {
      return getOutputFormatters();
    } catch (error) {
      // Fallback if output formatters not available
      return {
        prepareDataRow: (fields, fileName) => [fileName, new Date(), 50]
      };
    }
  }

  /**
   * Setup sheet headers for first-time use
   */
  setupSheetHeaders(sheet) {
    const headers = [
      'PDF File', // Column A
      ...this.getSheetConfig().headers, // Columns B-T
      'Processing Date', 'Overall Confidence', 'Review Required', 'Validation Errors'
    ];
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    
    // Format headers
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(12);
    headerRange.setBackground('#E8F0FE');
    headerRange.setBorder(true, true, true, true, true, true);
    
    // Freeze header row
    sheet.setFrozenRows(1);
  }

  /**
   * Apply conditional formatting based on confidence levels
   */
  applyConditionalFormatting(sheet, rowNumber, validatedFields) {
    const fieldNames = this.getConfig().getFieldNames();
    const colors = this.getSheetConfig().confidenceColors;
    
    for (let i = 0; i < fieldNames.length; i++) {
      const fieldName = fieldNames[i];
      const field = validatedFields[fieldName];
      const columnNumber = i + 2; // +1 for PDF filename, +1 for 1-based indexing
      
      if (field?.finalConfidence !== undefined) {
        const confidence = field.finalConfidence;
        let backgroundColor;
        
        if (confidence >= 85) {
          backgroundColor = colors.high; // Green
        } else if (confidence >= 70) {
          backgroundColor = colors.medium; // Orange
        } else if (confidence >= 50) {
          backgroundColor = colors.low; // Red
        } else {
          backgroundColor = colors.veryLow; // Gray
        }
        
        const cellRange = sheet.getRange(rowNumber, columnNumber);
        cellRange.setBackground(backgroundColor);
        
        // Add validation note for low confidence
        if (confidence < 70 || field.validationErrors?.length > 0) {
          const outputFormatters = this.getOutputFormatters();
          const note = outputFormatters.createValidationNote(field);
          cellRange.setNote(note);
        }
      }
    }
  }

  /**
   * Apply basic cell formatting
   */
  applyBasicFormatting(sheet, rowNumber) {
    const dataRange = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn());
    
    // Set borders
    dataRange.setBorder(true, true, true, true, true, true, '#CCCCCC', SpreadsheetApp.BorderStyle.SOLID);
    
    // Set font
    dataRange.setFontFamily('Arial');
    dataRange.setFontSize(11);
    
    // Set alignment
    dataRange.setVerticalAlignment('middle');
    dataRange.setWrap(true);
    
    // Set specific column formatting
    this.applyColumnSpecificFormatting(sheet, rowNumber);
  }

  /**
   * Apply formatting specific to certain column types
   */
  applyColumnSpecificFormatting(sheet, rowNumber) {
    // Processing date column (format as date)
    const dateColumnIndex = this.getConfig().getFieldNames().length + 2; // +1 for filename, +1 for date
    const dateRange = sheet.getRange(rowNumber, dateColumnIndex);
    dateRange.setNumberFormat('MM/dd/yyyy HH:mm');
    
    // Overall confidence column (format as percentage)
    const confidenceColumnIndex = dateColumnIndex + 1;
    const confidenceRange = sheet.getRange(rowNumber, confidenceColumnIndex);
    confidenceRange.setNumberFormat('#"%"');
    
    // Set specific column widths for better readability
    if (sheet.getLastRow() === rowNumber) { // Only on first row to avoid repeated resizing
      this.setOptimalColumnWidths(sheet);
    }
  }

  /**
   * Set optimal column widths
   */
  setOptimalColumnWidths(sheet) {
    const fieldNames = this.getConfig().getFieldNames();
    
    // PDF filename column
    sheet.setColumnWidth(1, 150);
    
    // Field columns
    for (let i = 0; i < fieldNames.length; i++) {
      const columnIndex = i + 2;
      const fieldName = fieldNames[i];
      
      // Set width based on field type
      let width;
      switch (fieldName) {
        case 'dimensions':
        case 'interfaces':
        case 'formats':
        case 'constellations':
        case 'product_description':
          width = 180; // Wider for longer text
          break;
        case 'firmware_options':
          width = 120;
          break;
        default:
          width = 100; // Standard width
      }
      
      sheet.setColumnWidth(columnIndex, width);
    }
    
    // Metadata columns
    const metadataStartCol = fieldNames.length + 2;
    sheet.setColumnWidth(metadataStartCol, 120); // Processing date
    sheet.setColumnWidth(metadataStartCol + 1, 100); // Overall confidence
    sheet.setColumnWidth(metadataStartCol + 2, 120); // Review required
    sheet.setColumnWidth(metadataStartCol + 3, 200); // Validation errors
  }

  /**
   * Auto-resize all columns to fit content
   */
  autoResizeColumns(sheet) {
    const lastColumn = sheet.getLastColumn();
    sheet.autoResizeColumns(1, lastColumn);
    
    // Apply maximum width constraints
    for (let i = 1; i <= lastColumn; i++) {
      const currentWidth = sheet.getColumnWidth(i);
      if (currentWidth > 300) {
        sheet.setColumnWidth(i, 300);
      } else if (currentWidth < 80) {
        sheet.setColumnWidth(i, 80);
      }
    }
  }

  /**
   * Create a summary sheet with statistics
   */
  createSummarySheet(spreadsheetId, validationSummary, sheetName = 'Processing Summary') {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      let summarySheet = spreadsheet.getSheetByName(sheetName);
      
      // Create or clear summary sheet
      if (!summarySheet) {
        summarySheet = spreadsheet.insertSheet(sheetName);
      } else {
        summarySheet.clear();
      }
      
      this.writeSummaryData(summarySheet, validationSummary);
      this.formatSummarySheet(summarySheet);
      
      return {
        success: true,
        sheetUrl: spreadsheet.getUrl() + `#gid=${summarySheet.getSheetId()}`
      };
      
    } catch (error) {
      console.error('Error creating summary sheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Write summary statistics to sheet
   */
  writeSummaryData(sheet, summary) {
    const outputFormatters = this.getOutputFormatters();
    const data = outputFormatters.prepareSummaryData(summary);
    
    const range = sheet.getRange(1, 1, data.length, 3);
    range.setValues(data);
  }

  /**
   * Format summary sheet for readability
   */
  formatSummarySheet(sheet) {
    // Title formatting
    const titleRange = sheet.getRange(1, 1, 1, 3);
    titleRange.merge();
    titleRange.setFontSize(16);
    titleRange.setFontWeight('bold');
    titleRange.setBackground('#1F4E79');
    titleRange.setFontColor('white');
    titleRange.setHorizontalAlignment('center');
    
    // Section headers formatting
    const sectionHeaders = [4, 10, 18];
    for (const rowNum of sectionHeaders) {
      const headerRange = sheet.getRange(rowNum, 1);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8F0FE');
    }
    
    // Set column widths
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 200);
    sheet.autoResizeRows(1, sheet.getLastRow());
  }
}

function getSheetFormatters() {
  if (typeof window === 'undefined' || !window.sheetFormattersInstance) {
    if (typeof window !== 'undefined') {
      window.sheetFormattersInstance = new SheetFormatters();
    } else {
      return new SheetFormatters();
    }
  }
  return window.sheetFormattersInstance || new SheetFormatters();
}
