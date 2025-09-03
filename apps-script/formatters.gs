/**
 * Formatters Module Interface
 * Coordinates output formatting and Google Sheets integration
 */

class FormattersInterface {
  constructor() {
    this.outputFormatters = null;
    this.sheetFormatters = null;
  }

  /**
   * Get output formatters instance
   */
  getOutputFormatters() {
    if (!this.outputFormatters) {
      try {
        this.outputFormatters = getOutputFormatters();
      } catch (error) {
        console.warn('OutputFormatters not available, using fallback');
        this.outputFormatters = this.createFallbackOutputFormatters();
      }
    }
    return this.outputFormatters;
  }

  /**
   * Get sheet formatters instance
   */
  getSheetFormatters() {
    if (!this.sheetFormatters) {
      try {
        this.sheetFormatters = getSheetFormatters();
      } catch (error) {
        console.warn('SheetFormatters not available, using fallback');
        this.sheetFormatters = this.createFallbackSheetFormatters();
      }
    }
    return this.sheetFormatters;
  }

  /**
   * Create fallback output formatters
   */
  createFallbackOutputFormatters() {
    return {
      exportToCSV: (fields, fileName) => 'PDF_File,Field,Value\n',
      generateTextReport: (fields, fileName, summary) => 'Processing complete',
      prepareDataRow: (fields, fileName) => [fileName, new Date(), 50]
    };
  }

  /**
   * Create fallback sheet formatters
   */
  createFallbackSheetFormatters() {
    return {
      writeToGoogleSheets: (fields, fileName, spreadsheetId) => ({
        success: false,
        error: 'Sheet formatters not available'
      }),
      createSummarySheet: (spreadsheetId, summary) => ({
        success: false,
        error: 'Sheet formatters not available'
      })
    };
  }

  // Delegate methods to output formatters
  exportToCSV(validatedFields, pdfFileName) {
    return this.getOutputFormatters().exportToCSV(validatedFields, pdfFileName);
  }

  exportToJSON(validatedFields, pdfFileName, validationSummary) {
    return this.getOutputFormatters().exportToJSON(validatedFields, pdfFileName, validationSummary);
  }

  generateTextReport(validatedFields, pdfFileName, validationSummary) {
    return this.getOutputFormatters().generateTextReport(validatedFields, pdfFileName, validationSummary);
  }

  generateCompactSummary(validatedFields, validationSummary) {
    return this.getOutputFormatters().generateCompactSummary(validatedFields, validationSummary);
  }

  formatFieldValue(fieldName, value) {
    return this.getOutputFormatters().formatFieldValue(fieldName, value);
  }

  getFieldDisplayName(fieldName) {
    return this.getOutputFormatters().getFieldDisplayName(fieldName);
  }

  // Delegate methods to sheet formatters
  writeToGoogleSheets(validatedFields, pdfFileName, spreadsheetId, sheetName) {
    return this.getSheetFormatters().writeToGoogleSheets(validatedFields, pdfFileName, spreadsheetId, sheetName);
  }

  createSummarySheet(spreadsheetId, validationSummary, sheetName) {
    return this.getSheetFormatters().createSummarySheet(spreadsheetId, validationSummary, sheetName);
  }

  createConfidenceChart(sheet, validationSummary) {
    return this.getSheetFormatters().createConfidenceChart(sheet, validationSummary);
  }

  createFilterViews(sheet) {
    return this.getSheetFormatters().createFilterViews(sheet);
  }

  // Convenience methods that combine both formatters
  processAndFormat(validatedFields, pdfFileName, validationSummary, outputOptions = {}) {
    const results = {
      textReport: null,
      csvData: null,
      jsonData: null,
      compactSummary: null,
      sheetResult: null
    };

    try {
      // Generate text report
      if (outputOptions.includeTextReport !== false) {
        results.textReport = this.generateTextReport(validatedFields, pdfFileName, validationSummary);
      }

      // Generate CSV export
      if (outputOptions.includeCsv !== false) {
        results.csvData = this.exportToCSV(validatedFields, pdfFileName);
      }

      // Generate JSON export
      if (outputOptions.includeJson !== false) {
        results.jsonData = this.exportToJSON(validatedFields, pdfFileName, validationSummary);
      }

      // Generate compact summary
      if (outputOptions.includeCompactSummary !== false) {
        results.compactSummary = this.generateCompactSummary(validatedFields, validationSummary);
      }

      // Write to Google Sheets if spreadsheet ID provided
      if (outputOptions.spreadsheetId) {
        results.sheetResult = this.writeToGoogleSheets(
          validatedFields, 
          pdfFileName, 
          outputOptions.spreadsheetId, 
          outputOptions.sheetName
        );
      }

      return { success: true, results: results };

    } catch (error) {
      console.error('Error in processAndFormat:', error);
      return { success: false, error: error.message, results: results };
    }
  }
}

// Backward compatibility exports
class OutputFormattersLegacy extends FormattersInterface {
  // Legacy method names for backward compatibility
  writeToGoogleSheets(validatedFields, pdfFileName, spreadsheetId, sheetName) {
    return super.writeToGoogleSheets(validatedFields, pdfFileName, spreadsheetId, sheetName);
  }

  createSummarySheet(spreadsheetId, validationSummary, sheetName) {
    return super.createSummarySheet(spreadsheetId, validationSummary, sheetName);
  }

  exportToCSV(validatedFields, pdfFileName) {
    return super.exportToCSV(validatedFields, pdfFileName);
  }

  generateTextReport(validatedFields, pdfFileName, validationSummary) {
    return super.generateTextReport(validatedFields, pdfFileName, validationSummary);
  }
}

// Export for backward compatibility
try {
  var FORMATTERS = new FormattersInterface();
  
  // Legacy function for getFormatters()
  function getFormatters() {
    return FORMATTERS;
  }
  
} catch (error) {
  console.error('Error initializing FORMATTERS interface:', error);
  var FORMATTERS = {
    writeToGoogleSheets: function() {
      return { success: false, error: 'Formatters not available' };
    },
    exportToCSV: function() {
      return 'PDF_File,Field,Value\n';
    }
  };
  
  function getFormatters() {
    return FORMATTERS;
  }
}
