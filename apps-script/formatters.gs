/**
 * GNSS PDF Parser Output Formatters
 * Handles Google Sheets integration, formatting, and data presentation
 */

class OutputFormatters {
  constructor() {
    // Lazy load config to avoid initialization order issues
    this.config = null;
    this.sheetConfig = null;
  }

  getConfig() {
    if (!this.config) {
      this.config = CONFIG;
      this.sheetConfig = this.config.outputFormatting.googleSheets;
    }
    return this.config;
  }

  getSheetConfig() {
    this.getConfig(); // Ensure config is loaded
    return this.sheetConfig;
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

      // Prepare data row
      const dataRow = this.prepareDataRow(validatedFields, pdfFileName);
      
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
   * Prepare data row from validated fields
   */
  prepareDataRow(validatedFields, pdfFileName) {
    const row = [pdfFileName]; // PDF file name first
    
    // Add field values in column order
    const fieldNames = this.getConfig().getFieldNames();
    for (const fieldName of fieldNames) {
      const field = validatedFields[fieldName];
      const value = field?.value || '';
      row.push(value);
    }
    
    // Add metadata columns
    row.push(new Date()); // Processing date
    row.push(validatedFields.overallConfidence || 0); // Overall confidence
    
    // Count fields requiring review
    const reviewCount = this.countReviewRequired(validatedFields);
    row.push(reviewCount > 0 ? `${reviewCount} fields` : 'None');
    
    // Collect validation errors
    const errorSummary = this.collectValidationErrors(validatedFields);
    row.push(errorSummary);
    
    return row;
  }

  /**
   * Count fields requiring manual review
   */
  countReviewRequired(validatedFields) {
    let count = 0;
    const fieldNames = this.getConfig().getFieldNames();
    
    for (const fieldName of fieldNames) {
      const field = validatedFields[fieldName];
      if (field?.needsReview) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Collect validation errors into summary string
   */
  collectValidationErrors(validatedFields) {
    const errors = [];
    const fieldNames = this.getConfig().getFieldNames();
    
    for (const fieldName of fieldNames) {
      const field = validatedFields[fieldName];
      if (field?.validationErrors && field.validationErrors.length > 0) {
        const fieldErrors = field.validationErrors.map(error => `${fieldName}: ${error}`);
        errors.push(...fieldErrors);
      }
    }
    
    return errors.length > 0 ? errors.join('; ') : 'None';
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
          const note = this.createValidationNote(field);
          cellRange.setNote(note);
        }
      }
    }
  }

  /**
   * Create validation note for cells with issues
   */
  createValidationNote(field) {
    const notes = [];
    
    notes.push(`Confidence: ${field.finalConfidence}%`);
    
    if (field.needsReview) {
      notes.push('⚠️ Manual review required');
    }
    
    if (field.validationErrors && field.validationErrors.length > 0) {
      notes.push('Validation errors:');
      field.validationErrors.forEach(error => notes.push(`• ${error}`));
    }
    
    if (field.method) {
      notes.push(`Extraction method: ${field.method}`);
    }
    
    if (field.context) {
      notes.push(`Context: ${field.context.substring(0, 100)}...`);
    }
    
    return notes.join('\n');
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
          width = 180; // Wider for longer text
          break;
        case 'model':
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
    const data = [
      ['GNSS PDF Parser - Processing Summary', '', ''],
      ['Generated:', new Date(), ''],
      ['', '', ''],
      ['Field Statistics', '', ''],
      ['Total Fields:', summary.totalFields, ''],
      ['Valid Fields:', summary.validFields, ''],
      ['Invalid Fields:', summary.invalidFields, ''],
      ['Review Required:', summary.reviewRequired, ''],
      ['', '', ''],
      ['Confidence Distribution', '', ''],
      ['High Confidence (85-100%):', summary.highConfidence, `${Math.round(summary.highConfidence/summary.totalFields*100)}%`],
      ['Medium Confidence (70-84%):', summary.mediumConfidence, `${Math.round(summary.mediumConfidence/summary.totalFields*100)}%`],
      ['Low Confidence (50-69%):', summary.lowConfidence, `${Math.round(summary.lowConfidence/summary.totalFields*100)}%`],
      ['Very Low Confidence (<50%):', summary.veryLowConfidence, `${Math.round(summary.veryLowConfidence/summary.totalFields*100)}%`],
      ['', '', ''],
      ['Average Confidence:', `${summary.averageConfidence}%`, ''],
      ['', '', ''],
      ['Critical Issues', '', '']
    ];
    
    // Add critical issues
    if (summary.criticalIssues.length > 0) {
      for (const issue of summary.criticalIssues) {
        data.push([
          issue.field,
          `${issue.confidence}% confidence`,
          issue.errors.join('; ')
        ]);
      }
    } else {
      data.push(['None', '', '']);
    }
    
    // Add warnings
    if (summary.warnings.length > 0) {
      data.push(['', '', '']);
      data.push(['Warnings', '', '']);
      for (const warning of summary.warnings) {
        data.push(['⚠️', warning, '']);
      }
    }
    
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
    
    // Section headers
    const sectionHeaders = [4, 10, 18]; // Row numbers with section headers
    for (const rowNum of sectionHeaders) {
      const headerRange = sheet.getRange(rowNum, 1);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8F0FE');
    }
    
    // Set column widths
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 200);
    
    // Auto-resize to fit content
    sheet.autoResizeRows(1, sheet.getLastRow());
  }

  /**
   * Export validation results to CSV format
   */
  exportToCSV(validatedFields, pdfFileName) {
    const csvData = [];
    
    // Headers
    const headers = [
      'PDF_File', 'Field', 'Value', 'Confidence', 'Is_Valid', 
      'Needs_Review', 'Method', 'Context', 'Errors'
    ];
    csvData.push(headers.join(','));
    
    // Data rows
    const fieldNames = this.getConfig().getFieldNames();
    for (const fieldName of fieldNames) {
      const field = validatedFields[fieldName];
      const row = [
        this.escapeCsvValue(pdfFileName),
        this.escapeCsvValue(fieldName),
        this.escapeCsvValue(field?.value || ''),
        field?.finalConfidence || 0,
        field?.isValid || false,
        field?.needsReview || false,
        this.escapeCsvValue(field?.method || ''),
        this.escapeCsvValue(field?.context || ''),
        this.escapeCsvValue(field?.validationErrors?.join('; ') || '')
      ];
      csvData.push(row.join(','));
    }
    
    return csvData.join('\n');
  }

  /**
   * Escape CSV values to handle commas and quotes
   */
  escapeCsvValue(value) {
    if (typeof value !== 'string') {
      return value;
    }
    
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }

  /**
   * Generate processing report as formatted text
   */
  generateTextReport(validatedFields, pdfFileName, validationSummary) {
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push('GNSS PDF PARSER - PROCESSING REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`PDF File: ${pdfFileName}`);
    lines.push(`Processing Date: ${new Date().toLocaleString()}`);
    lines.push(`Overall Confidence: ${validatedFields.overallConfidence}%`);
    lines.push('');
    
    // Summary statistics
    lines.push('SUMMARY STATISTICS');
    lines.push('-'.repeat(30));
    lines.push(`Total Fields: ${validationSummary.totalFields}`);
    lines.push(`Valid Fields: ${validationSummary.validFields} (${Math.round(validationSummary.validFields/validationSummary.totalFields*100)}%)`);
    lines.push(`Review Required: ${validationSummary.reviewRequired}`);
    lines.push(`Average Confidence: ${validationSummary.averageConfidence}%`);
    lines.push('');
    
    // Field details
    lines.push('FIELD EXTRACTION RESULTS');
    lines.push('-'.repeat(30));
    
    const fieldNames = this.getConfig().getFieldNames();
    for (const fieldName of fieldNames) {
      const field = validatedFields[fieldName];
      const status = field?.isValid ? '✓' : '✗';
      const confidence = field?.finalConfidence || 0;
      const value = field?.value || 'NOT_EXTRACTED';
      
      lines.push(`${status} ${fieldName}: ${value} (${confidence}%)`);
      
      if (field?.needsReview) {
        lines.push(`    ⚠️ REVIEW REQUIRED`);
      }
      
      if (field?.validationErrors?.length > 0) {
        lines.push(`    Errors: ${field.validationErrors.join(', ')}`);
      }
    }
    
    // Critical issues
    if (validationSummary.criticalIssues.length > 0) {
      lines.push('');
      lines.push('CRITICAL ISSUES');
      lines.push('-'.repeat(30));
      for (const issue of validationSummary.criticalIssues) {
        lines.push(`• ${issue.field}: ${issue.confidence}% confidence`);
        for (const error of issue.errors) {
          lines.push(`  - ${error}`);
        }
      }
    }
    
    // Warnings
    if (validationSummary.warnings.length > 0) {
      lines.push('');
      lines.push('WARNINGS');
      lines.push('-'.repeat(30));
      for (const warning of validationSummary.warnings) {
        lines.push(`⚠️ ${warning}`);
      }
    }
    
    lines.push('');
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }
}

// Export for use in other modules
var FORMATTERS = new OutputFormatters();
