/**
 * GNSS PDF Parser Validation and Confidence Scoring
 * Validates extracted field values and calculates confidence scores
 */

class FieldValidators {
  constructor() {
    // Initialize with proper error handling and fallback
    this.initializeConfig();
  }

  /**
   * Initialize configuration with error handling
   */
  initializeConfig() {
    try {
      // Try to get CONFIG from config.gs, create default if not available
      this.config = (typeof CONFIG !== 'undefined' && CONFIG !== null) ? CONFIG : this.getDefaultConfig();
      this.rules = this.config.validationRules || this.getDefaultValidationRules();
    } catch (error) {
      console.warn('Could not load CONFIG from config.gs, using defaults:', error);
      this.config = this.getDefaultConfig();
      this.rules = this.getDefaultValidationRules();
    }
  }

  /**
   * Reinitialize with proper CONFIG if it becomes available
   */
  reinitialize() {
    this.initializeConfig();
  }

  /**
   * Get default configuration if CONFIG is not available
   */
  getDefaultConfig() {
    return {
      validationRules: this.getDefaultValidationRules()
    };
  }

  /**
   * Get default validation rules if config is not loaded
   */
  getDefaultValidationRules() {
    return {
      global: {
        requiredConfidenceMinimum: 50,
        autoRejectBelow: 30,
        manualReviewThreshold: 70,
        highConfidenceThreshold: 85,
        maximumFieldLength: 500
      },
      
      fieldRules: {
        dimensions: {
          required: true,
          formatPattern: /^\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*mm$/,
          valueRanges: {
            lengthMm: {min: 10, max: 500},
            widthMm: {min: 10, max: 500},
            heightMm: {min: 5, max: 200}
          }
        },
        
        weight: {
          required: true,
          formatPattern: /^\d+(?:\.\d+)?\s*g$/,
          valueRanges: {
            weightG: {min: 5, max: 5000}
          }
        },
        
        operating_temperature: {
          required: true,
          formatPattern: /^-?\d+(?:\.\d+)?\s*to\s*\+?\d+(?:\.\d+)?°C$/,
          valueRanges: {
            minTempC: {min: -60, max: 10},
            maxTempC: {min: 40, max: 100}
          }
        },
        
        accuracy: {
          required: true,
          formatPattern: /^\d+(?:\.\d+)?\s*cm(?:\s*\+\s*\d+(?:\.\d+)?\s*ppm)?$/,
          valueRanges: {
            horizontalAccuracyCm: {min: 0.1, max: 500},
            verticalAccuracyCm: {min: 0.1, max: 1000}
          }
        }
      }
    };
  }

  /**
   * Validate all extracted fields and calculate overall confidence
   */
  validateAllFields(extractedFields) {
    const results = {};
    let totalConfidence = 0;
    let validFieldCount = 0;

    for (const [fieldName, extraction] of Object.entries(extractedFields)) {
      const validation = this.validateField(fieldName, extraction);
      results[fieldName] = {
        ...extraction,
        isValid: validation.isValid,
        validationErrors: validation.errors,
        finalConfidence: validation.finalConfidence,
        needsReview: validation.needsReview
      };

      if (validation.isValid) {
        totalConfidence += validation.finalConfidence;
        validFieldCount++;
      }
    }

    results.overallConfidence = validFieldCount > 0 ? Math.round(totalConfidence / validFieldCount) : 0;
    results.validFieldCount = validFieldCount;
    results.totalFields = Object.keys(extractedFields).length;

    return results;
  }

  /**
   * Validate a single field extraction
   */
  validateField(fieldName, extraction) {
    const fieldRules = this.rules.fieldRules[fieldName];
    const globalRules = this.rules.global;
    
    let isValid = true;
    let errors = [];
    let confidence = extraction.confidence || 0;

    // Skip validation if no value extracted
    if (!extraction.value) {
      return {
        isValid: false,
        errors: ['No value extracted'],
        finalConfidence: 0,
        needsReview: true
      };
    }

    // Apply field-specific validation
    if (fieldRules) {
      const fieldValidation = this.validateFieldSpecific(extraction.value, fieldRules);
      isValid = isValid && fieldValidation.isValid;
      errors.push(...fieldValidation.errors);
      confidence = this.adjustConfidenceForValidation(confidence, fieldValidation);
    }

    // Apply global validation rules
    const globalValidation = this.validateGlobalRules(extraction.value, globalRules);
    isValid = isValid && globalValidation.isValid;
    errors.push(...globalValidation.errors);

    // Calculate final confidence score
    const finalConfidence = this.calculateFinalConfidence(
      confidence, 
      extraction, 
      isValid, 
      errors.length
    );

    // Determine if manual review is needed
    const needsReview = this.needsManualReview(finalConfidence, isValid, fieldName);

    return {
      isValid,
      errors,
      finalConfidence,
      needsReview
    };
  }

  /**
   * Apply field-specific validation rules
   */
  validateFieldSpecific(value, rules) {
    let isValid = true;
    let errors = [];

    // Format pattern validation
    if (rules.formatPattern && !rules.formatPattern.test(value)) {
      isValid = false;
      errors.push(`Format does not match expected pattern: ${rules.formatPattern}`);
    }

    // Value range validation
    if (rules.valueRanges) {
      const rangeValidation = this.validateValueRanges(value, rules.valueRanges);
      isValid = isValid && rangeValidation.isValid;
      errors.push(...rangeValidation.errors);
    }

    // Field-specific custom validation
    const customValidation = this.validateFieldCustom(value, rules);
    isValid = isValid && customValidation.isValid;
    errors.push(...customValidation.errors);

    return { isValid, errors };
  }

  /**
   * Validate value ranges for numeric fields
   */
  validateValueRanges(value, ranges) {
    let isValid = true;
    let errors = [];

    for (const [rangeName, range] of Object.entries(ranges)) {
      const numericValue = this.extractNumericValue(value, rangeName);
      
      if (numericValue !== null) {
        if (numericValue < range.min) {
          isValid = false;
          errors.push(`${rangeName}: ${numericValue} is below minimum ${range.min}`);
        }
        
        if (numericValue > range.max) {
          isValid = false;
          errors.push(`${rangeName}: ${numericValue} is above maximum ${range.max}`);
        }
      }
    }

    return { isValid, errors };
  }

  /**
   * Extract numeric value for range validation
   */
  extractNumericValue(value, rangeName) {
    try {
      switch (rangeName) {
        case 'lengthMm':
        case 'widthMm':
        case 'heightMm':
          return this.extractDimensionValue(value, rangeName);
        case 'weightG':
          return this.extractWeightValue(value);
        case 'minTempC':
        case 'maxTempC':
          return this.extractTemperatureValue(value, rangeName);
        case 'horizontalAccuracyCm':
        case 'verticalAccuracyCm':
          return this.extractAccuracyValue(value, rangeName);
        default:
          const match = value.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : null;
      }
    } catch (error) {
      console.warn(`Error extracting numeric value for ${rangeName}:`, error);
      return null;
    }
  }

  /**
   * Extract dimension values for validation
   */
  extractDimensionValue(value, dimension) {
    const match = value.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
    if (!match) return null;

    const [, length, width, height] = match.map(v => parseFloat(v));
    
    switch (dimension) {
      case 'lengthMm': return length;
      case 'widthMm': return width;
      case 'heightMm': return height;
      default: return null;
    }
  }

  /**
   * Extract weight value for validation
   */
  extractWeightValue(value) {
    const match = value.match(/(\d+(?:\.\d+)?)\s*g/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Extract temperature values for validation
   */
  extractTemperatureValue(value, tempType) {
    const match = value.match(/([-+]?\d+(?:\.\d+)?)\s*°C\s*to\s*([-+]?\d+(?:\.\d+)?)\s*°C/);
    if (!match) return null;

    const [, min, max] = match.map(v => parseFloat(v));
    
    switch (tempType) {
      case 'minTempC': return min;
      case 'maxTempC': return max;
      default: return null;
    }
  }

  /**
   * Extract accuracy values for validation
   */
  extractAccuracyValue(value, accType) {
    const match = value.match(/(\d+(?:\.\d+)?)\s*cm/);
    if (!match) return null;

    const accuracy = parseFloat(match[1]);
    
    // For now, assume horizontal and vertical are the same
    // This could be enhanced to parse separate H/V values
    return accuracy;
  }

  /**
   * Apply custom validation rules per field type
   */
  validateFieldCustom(value, rules) {
    let isValid = true;
    let errors = [];

    // Custom validation based on field type
    if (rules.required && (!value || value.trim() === '')) {
      isValid = false;
      errors.push('Required field is empty');
    }

    // Length validation
    if (value && value.length > this.rules.global.maximumFieldLength) {
      isValid = false;
      errors.push(`Value too long: ${value.length} > ${this.rules.global.maximumFieldLength}`);
    }

    return { isValid, errors };
  }

  /**
   * Apply global validation rules
   */
  validateGlobalRules(value, globalRules) {
    let isValid = true;
    let errors = [];

    // Character validation (basic implementation)
    if (value && typeof value === 'string') {
      // Check for unusual characters that might indicate OCR errors
      const suspiciousChars = /[^\w\s.,;:()\-+×°/]/;
      if (suspiciousChars.test(value)) {
        errors.push('Contains potentially invalid characters');
      }
    }

    return { isValid, errors };
  }

  /**
   * Adjust confidence based on validation results
   */
  adjustConfidenceForValidation(baseConfidence, validation) {
    let adjusted = baseConfidence;

    if (!validation.isValid) {
      adjusted -= 20; // Penalty for validation failure
    }

    // Additional penalty for multiple errors
    if (validation.errors.length > 1) {
      adjusted -= (validation.errors.length - 1) * 5;
    }

    return Math.max(0, Math.min(100, adjusted));
  }

  /**
   * Calculate final confidence score with all factors
   */
  calculateFinalConfidence(baseConfidence, extraction, isValid, errorCount) {
    let confidence = baseConfidence;

    // Source quality bonus/penalty
    const sourceBonus = this.calculateSourceQualityBonus(extraction.method);
    confidence += sourceBonus;

    // Context quality bonus
    if (extraction.context && extraction.context.length > 20) {
      confidence += 5; // Bonus for good context
    }

    // Validation penalty
    if (!isValid) {
      confidence -= 15;
    }

    // Error count penalty
    confidence -= errorCount * 3;

    // Normalization success bonus
    if (extraction.rawValue && extraction.value !== extraction.rawValue) {
      confidence += 8; // Bonus for successful normalization
    }

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Calculate bonus/penalty based on extraction method
   */
  calculateSourceQualityBonus(method) {
    switch (method) {
      case 'label_same_line':
        return 15; // Highest confidence
      case 'label_next_line':
        return 10;
      case 'pattern_match':
        return 5;
      case 'proximity_based':
        return 0;
      default:
        return -5; // Penalty for unknown method
    }
  }

  /**
   * Determine if field needs manual review
   */
  needsManualReview(confidence, isValid, fieldName) {
    const globalRules = this.rules.global;

    // Auto-reject very low confidence
    if (confidence < globalRules.autoRejectBelow) {
      return true;
    }

    // Manual review for medium confidence
    if (confidence < globalRules.manualReviewThreshold) {
      return true;
    }

    // Manual review for validation failures
    if (!isValid) {
      return true;
    }

    // Field-specific manual review rules
    const criticalFields = ['accuracy', 'dimensions', 'weight'];
    if (criticalFields.includes(fieldName) && confidence < globalRules.highConfidenceThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Get confidence level category
   */
  getConfidenceLevel(confidence) {
    const globalRules = this.rules.global;

    if (confidence >= globalRules.highConfidenceThreshold) {
      return 'high';
    } else if (confidence >= globalRules.manualReviewThreshold) {
      return 'medium';
    } else if (confidence >= globalRules.requiredConfidenceMinimum) {
      return 'low';
    } else {
      return 'very_low';
    }
  }

  /**
   * Cross-field validation for logical consistency
   */
  validateCrossFieldConsistency(validatedFields) {
    const warnings = [];

    // Check dimensions vs weight reasonableness
    const dimensions = validatedFields.dimensions;
    const weight = validatedFields.weight;
    
    if (dimensions?.value && weight?.value) {
      const dimensionCheck = this.validateDimensionWeightConsistency(
        dimensions.value, 
        weight.value
      );
      if (!dimensionCheck.isReasonable) {
        warnings.push(`Dimension/weight mismatch: ${dimensionCheck.reason}`);
      }
    }

    // Check temperature range ordering
    const opTemp = validatedFields.operating_temperature;
    const storageTemp = validatedFields.storage_temperature;
    
    if (opTemp?.value && storageTemp?.value) {
      const tempCheck = this.validateTemperatureRangeConsistency(
        opTemp.value, 
        storageTemp.value
      );
      if (!tempCheck.isLogical) {
        warnings.push(`Temperature range issue: ${tempCheck.reason}`);
      }
    }

    return warnings;
  }

  /**
   * Validate dimension/weight consistency
   */
  validateDimensionWeightConsistency(dimensions, weight) {
    try {
      const dimMatch = dimensions.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
      const weightMatch = weight.match(/(\d+(?:\.\d+)?)\s*g/);
      
      if (!dimMatch || !weightMatch) {
        return { isReasonable: true, reason: 'Cannot parse values' };
      }

      const [, l, w, h] = dimMatch.map(v => parseFloat(v));
      const weightG = parseFloat(weightMatch[1]);

      // Calculate volume in cubic cm
      const volumeCm3 = (l / 10) * (w / 10) * (h / 10);
      
      // Rough density check (electronics typically 0.5-3 g/cm³)
      const density = weightG / volumeCm3;
      
      if (density < 0.1 || density > 5) {
        return {
          isReasonable: false,
          reason: `Unusual density: ${density.toFixed(2)} g/cm³`
        };
      }

      return { isReasonable: true, reason: 'Consistent' };
    } catch (error) {
      return { isReasonable: true, reason: 'Validation error' };
    }
  }

  /**
   * Validate temperature range logical ordering
   */
  validateTemperatureRangeConsistency(operating, storage) {
    try {
      const opMatch = operating.match(/([-+]?\d+(?:\.\d+)?)\s*°C\s*to\s*([-+]?\d+(?:\.\d+)?)\s*°C/);
      const storageMatch = storage.match(/([-+]?\d+(?:\.\d+)?)\s*°C\s*to\s*([-+]?\d+(?:\.\d+)?)\s*°C/);
      
      if (!opMatch || !storageMatch) {
        return { isLogical: true, reason: 'Cannot parse ranges' };
      }

      const [, opMin, opMax] = opMatch.map(v => parseFloat(v));
      const [, storageMin, storageMax] = storageMatch.map(v => parseFloat(v));

      // Storage range should typically be wider than operating range
      if (storageMin > opMin || storageMax < opMax) {
        return {
          isLogical: false,
          reason: 'Storage range should be wider than operating range'
        };
      }

      return { isLogical: true, reason: 'Logical ordering' };
    } catch (error) {
      return { isLogical: true, reason: 'Validation error' };
    }
  }

  /**
   * Generate validation summary report
   */
  generateValidationSummary(validatedFields) {
    const summary = {
      totalFields: 0,
      validFields: 0,
      invalidFields: 0,
      reviewRequired: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      veryLowConfidence: 0,
      averageConfidence: 0,
      criticalIssues: [],
      warnings: []
    };

    let totalConfidence = 0;

    for (const [fieldName, field] of Object.entries(validatedFields)) {
      if (fieldName.startsWith('overall') || fieldName.startsWith('total') || fieldName.startsWith('valid')) {
        continue; // Skip summary fields
      }

      summary.totalFields++;
      
      if (field.isValid) {
        summary.validFields++;
      } else {
        summary.invalidFields++;
      }

      if (field.needsReview) {
        summary.reviewRequired++;
      }

      const confidenceLevel = this.getConfidenceLevel(field.finalConfidence);
      summary[`${confidenceLevel}Confidence`]++;

      totalConfidence += field.finalConfidence;

      // Collect critical issues
      if (!field.isValid || field.finalConfidence < 30) {
        summary.criticalIssues.push({
          field: fieldName,
          confidence: field.finalConfidence,
          errors: field.validationErrors
        });
      }
    }

    summary.averageConfidence = summary.totalFields > 0 ? 
      Math.round(totalConfidence / summary.totalFields) : 0;

    // Add cross-field validation warnings
    summary.warnings = this.validateCrossFieldConsistency(validatedFields);

    return summary;
  }
}

// Export for use in other modules with error handling
try {
  var VALIDATORS = new FieldValidators();
} catch (error) {
  console.error('Error initializing VALIDATORS:', error);
  // Create a minimal fallback validator
  var VALIDATORS = {
    validateAllFields: function(fields) {
      console.warn('Using fallback validator due to initialization error');
      return { overallConfidence: 50, validFieldCount: 0, totalFields: 0 };
    }
  };
}
