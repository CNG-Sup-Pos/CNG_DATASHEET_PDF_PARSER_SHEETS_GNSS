/**
 * Output Formatters Module
 * Handles data preparation, CSV export, and text report generation
 */

class OutputFormatters {
  constructor() {
    this.config = null;
  }

  /**
   * Get configuration with lazy loading
   */
  getConfig() {
    if (!this.config) {
      try {
        this.config = CONFIG;
      } catch (error) {
        console.warn('CONFIG not available, using fallback');
        this.config = this.createFallbackConfig();
      }
    }
    return this.config;
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
   * Prepare data row from validated fields for sheet output
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
   * Write summary statistics data for sheets
   */
  prepareSummaryData(summary) {
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
    
    return data;
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
   * Export validation results to JSON format
   */
  exportToJSON(validatedFields, pdfFileName, validationSummary) {
    return JSON.stringify({
      metadata: {
        pdfFileName: pdfFileName,
        processingDate: new Date().toISOString(),
        overallConfidence: validatedFields.overallConfidence || 0,
        version: '1.0'
      },
      summary: validationSummary,
      fields: validatedFields
    }, null, 2);
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

  /**
   * Generate compact summary for dashboard display
   */
  generateCompactSummary(validatedFields, validationSummary) {
    const summary = [];
    
    summary.push(`${validationSummary.validFields}/${validationSummary.totalFields} fields extracted`);
    summary.push(`${validatedFields.overallConfidence}% avg confidence`);
    
    if (validationSummary.reviewRequired > 0) {
      summary.push(`${validationSummary.reviewRequired} need review`);
    }
    
    if (validationSummary.criticalIssues.length > 0) {
      summary.push(`${validationSummary.criticalIssues.length} critical issues`);
    }
    
    return summary.join(' • ');
  }

  /**
   * Format field value for display based on field type
   */
  formatFieldValue(fieldName, value) {
    if (!value) return '';
    
    switch (fieldName) {
      case 'dimensions':
        return value.replace(/[×x]/g, ' × ');
      case 'weight':
        return value.replace(/g$/, ' g');
      case 'operating_temperature':
      case 'storage_temperature':
        return value.replace(/to/, ' to ');
      case 'accuracy':
        return value.replace(/cm/, ' cm');
      case 'power_consumption':
        return value.replace(/W$/, ' W');
      case 'frequency':
        return value.replace(/Hz/, ' Hz');
      case 'latency':
        return value.replace(/ms/, ' ms');
      case 'product_description':
        return value.length > 100 ? value.substring(0, 97) + '...' : value;
      default:
        return value;
    }
  }
}

function getOutputFormatters() {
  if (typeof window === 'undefined' || !window.outputFormattersInstance) {
    if (typeof window !== 'undefined') {
      window.outputFormattersInstance = new OutputFormatters();
    } else {
      return new OutputFormatters();
    }
  }
  return window.outputFormattersInstance || new OutputFormatters();
}
