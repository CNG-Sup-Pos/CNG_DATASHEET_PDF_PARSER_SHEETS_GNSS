/**
 * Validators Module Interface
 * Coordinates field validation and cross-field consistency checks
 */

class ValidatorsInterface {
  constructor() {
    this.fieldValidators = null;
    this.validationHelpers = null;
  }

  /**
   * Get field validators instance
   */
  getFieldValidators() {
    if (!this.fieldValidators) {
      try {
        this.fieldValidators = getFieldValidators();
      } catch (error) {
        console.warn('FieldValidators not available, using fallback');
        this.fieldValidators = this.createFallbackValidator();
      }
    }
    return this.fieldValidators;
  }

  /**
   * Get validation helpers instance
   */
  getValidationHelpers() {
    if (!this.validationHelpers) {
      try {
        this.validationHelpers = getValidationHelpers();
      } catch (error) {
        console.warn('ValidationHelpers not available, using fallback');
        this.validationHelpers = this.createFallbackHelper();
      }
    }
    return this.validationHelpers;
  }

  /**
   * Create fallback validator
   */
  createFallbackValidator() {
    return {
      validateAllFields: (fields) => ({
        overallConfidence: 50,
        validFieldCount: 0,
        totalFields: Object.keys(fields).length
      }),
      validateField: (fieldName, extraction) => ({
        isValid: true,
        errors: [],
        finalConfidence: 50,
        needsReview: true
      }),
      getConfidenceLevel: (confidence) => 'medium'
    };
  }

  /**
   * Create fallback helper
   */
  createFallbackHelper() {
    return {
      validateCrossFieldConsistency: () => [],
      generateValidationSummary: (fields) => ({
        totalFields: Object.keys(fields).length,
        validFields: 0,
        invalidFields: 0,
        reviewRequired: 0,
        averageConfidence: 50,
        criticalIssues: [],
        warnings: []
      })
    };
  }

  /**
   * Validate all extracted fields (delegates to field validators)
   */
  validateAllFields(extractedFields) {
    return this.getFieldValidators().validateAllFields(extractedFields);
  }

  /**
   * Validate a single field (delegates to field validators)
   */
  validateField(fieldName, extraction) {
    return this.getFieldValidators().validateField(fieldName, extraction);
  }

  /**
   * Get confidence level category (delegates to field validators)
   */
  getConfidenceLevel(confidence) {
    return this.getFieldValidators().getConfidenceLevel(confidence);
  }

  /**
   * Cross-field validation (delegates to validation helpers)
   */
  validateCrossFieldConsistency(validatedFields) {
    return this.getValidationHelpers().validateCrossFieldConsistency(validatedFields);
  }

  /**
   * Generate validation summary (delegates to validation helpers)
   */
  generateValidationSummary(validatedFields) {
    return this.getValidationHelpers().generateValidationSummary(validatedFields);
  }

  /**
   * Generate detailed validation report (delegates to validation helpers)
   */
  generateDetailedValidationReport(validatedFields) {
    return this.getValidationHelpers().generateDetailedValidationReport(validatedFields);
  }

  /**
   * Check quality thresholds (delegates to validation helpers)
   */
  meetsQualityThresholds(validatedFields, thresholds) {
    return this.getValidationHelpers().meetsQualityThresholds(validatedFields, thresholds);
  }
}

// Export for backward compatibility
try {
  var VALIDATORS = new ValidatorsInterface();
} catch (error) {
  console.error('Error initializing VALIDATORS interface:', error);
  var VALIDATORS = {
    validateAllFields: function(fields) {
      console.warn('Using minimal fallback validator');
      return { overallConfidence: 50, validFieldCount: 0, totalFields: 0 };
    }
  };
}
