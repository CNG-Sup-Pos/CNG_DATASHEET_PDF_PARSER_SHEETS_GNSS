/**
 * Field-Specific Validation Module
 * Handles validation rules and confidence scoring for individual fields
 */

class FieldValidators {
  constructor() {
    this.initializeConfig();
  }

  /**
   * Initialize configuration with error handling
   */
  initializeConfig() {
    try {
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
    return accuracy;
  }

  /**
   * Apply custom validation rules per field type
   */
  validateFieldCustom(value, rules) {
    let isValid = true;
    let errors = [];

    if (rules.required && (!value || value.trim() === '')) {
      isValid = false;
      errors.push('Required field is empty');
    }

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

    if (value && typeof value === 'string') {
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
      adjusted -= 20;
    }

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

    const sourceBonus = this.calculateSourceQualityBonus(extraction.method);
    confidence += sourceBonus;

    if (extraction.context && extraction.context.length > 20) {
      confidence += 5;
    }

    if (!isValid) {
      confidence -= 15;
    }

    confidence -= errorCount * 3;

    if (extraction.rawValue && extraction.value !== extraction.rawValue) {
      confidence += 8;
    }

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Calculate bonus/penalty based on extraction method
   */
  calculateSourceQualityBonus(method) {
    switch (method) {
      case 'label_same_line':
        return 15;
      case 'label_next_line':
        return 10;
      case 'pattern_match':
        return 5;
      case 'proximity_based':
        return 0;
      default:
        return -5;
    }
  }

  /**
   * Determine if field needs manual review
   */
  needsManualReview(confidence, isValid, fieldName) {
    const globalRules = this.rules.global;

    if (confidence < globalRules.autoRejectBelow) {
      return true;
    }

    if (confidence < globalRules.manualReviewThreshold) {
      return true;
    }

    if (!isValid) {
      return true;
    }

    const criticalFields = ['accuracy', 'dimensions', 'weight'];
    if (criticalFields.includes(fieldName) && confidence < globalRules.highConfidenceThreshold) {
      return true;
    }

    return false;
  }
}

function getFieldValidators() {
  if (typeof window === 'undefined' || !window.fieldValidatorsInstance) {
    if (typeof window !== 'undefined') {
      window.fieldValidatorsInstance = new FieldValidators();
    } else {
      return new FieldValidators();
    }
  }
  return window.fieldValidatorsInstance || new FieldValidators();
}
