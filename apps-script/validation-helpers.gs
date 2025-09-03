/**
 * Validation Helpers Module
 * Cross-field validation, consistency checks, and validation summaries
 */

class ValidationHelpers {
  constructor() {
    this.fieldValidators = null;
  }

  /**
   * Get field validators instance
   */
  getFieldValidators() {
    if (!this.fieldValidators) {
      try {
        this.fieldValidators = getFieldValidators();
      } catch (error) {
        console.warn('Could not get FieldValidators, using minimal fallback');
        this.fieldValidators = this.createMinimalValidators();
      }
    }
    return this.fieldValidators;
  }

  /**
   * Create minimal validators fallback
   */
  createMinimalValidators() {
    return {
      getConfidenceLevel: (confidence) => {
        if (confidence >= 85) return 'high';
        if (confidence >= 70) return 'medium';
        if (confidence >= 50) return 'low';
        return 'very_low';
      }
    };
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

    // Check power consumption vs operating temperature
    const power = validatedFields.power_consumption;
    const operatingTemp = validatedFields.operating_temperature;
    
    if (power?.value && operatingTemp?.value) {
      const powerTempCheck = this.validatePowerTemperatureConsistency(
        power.value,
        operatingTemp.value
      );
      if (!powerTempCheck.isReasonable) {
        warnings.push(`Power/temperature inconsistency: ${powerTempCheck.reason}`);
      }
    }

    // Check voltage vs power consistency
    const voltage = validatedFields.input_voltage;
    
    if (voltage?.value && power?.value) {
      const voltagePowerCheck = this.validateVoltagePowerConsistency(
        voltage.value,
        power.value
      );
      if (!voltagePowerCheck.isReasonable) {
        warnings.push(`Voltage/power inconsistency: ${voltagePowerCheck.reason}`);
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
   * Validate power consumption vs temperature consistency
   */
  validatePowerTemperatureConsistency(power, temperature) {
    try {
      const powerMatch = power.match(/(\d+(?:\.\d+)?)\s*mW/);
      const tempMatch = temperature.match(/([-+]?\d+(?:\.\d+)?)\s*°C\s*to\s*([-+]?\d+(?:\.\d+)?)\s*°C/);
      
      if (!powerMatch || !tempMatch) {
        return { isReasonable: true, reason: 'Cannot parse values' };
      }

      const powerMw = parseFloat(powerMatch[1]);
      const [, tempMin, tempMax] = tempMatch.map(v => parseFloat(v));
      
      // Very high power consumption should correlate with higher max temperatures
      if (powerMw > 1000 && tempMax < 70) {
        return {
          isReasonable: false,
          reason: 'High power consumption but low max temperature'
        };
      }

      // Very low power consumption with extreme temperature ranges seems odd
      if (powerMw < 50 && (tempMax > 85 || tempMin < -40)) {
        return {
          isReasonable: false,
          reason: 'Low power but extreme temperature range'
        };
      }

      return { isReasonable: true, reason: 'Consistent' };
    } catch (error) {
      return { isReasonable: true, reason: 'Validation error' };
    }
  }

  /**
   * Validate voltage vs power consumption consistency
   */
  validateVoltagePowerConsistency(voltage, power) {
    try {
      const voltageMatch = voltage.match(/(\d+(?:\.\d+)?)\s*V/);
      const powerMatch = power.match(/(\d+(?:\.\d+)?)\s*mW/);
      
      if (!voltageMatch || !powerMatch) {
        return { isReasonable: true, reason: 'Cannot parse values' };
      }

      const voltageV = parseFloat(voltageMatch[1]);
      const powerMw = parseFloat(powerMatch[1]);
      
      // Calculate implied current (rough estimate)
      const currentMa = powerMw / voltageV;
      
      // Unreasonably high current (>5A = 5000mA)
      if (currentMa > 5000) {
        return {
          isReasonable: false,
          reason: `Implied current too high: ${currentMa.toFixed(1)}mA`
        };
      }

      // Unreasonably low current (<0.1mA) for operational devices
      if (currentMa < 0.1) {
        return {
          isReasonable: false,
          reason: `Implied current too low: ${currentMa.toFixed(3)}mA`
        };
      }

      return { isReasonable: true, reason: 'Consistent' };
    } catch (error) {
      return { isReasonable: true, reason: 'Validation error' };
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
    const validators = this.getFieldValidators();

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

      const confidenceLevel = validators.getConfidenceLevel(field.finalConfidence);
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

  /**
   * Generate detailed validation report
   */
  generateDetailedValidationReport(validatedFields) {
    const summary = this.generateValidationSummary(validatedFields);
    
    const report = {
      summary: summary,
      fieldDetails: {},
      recommendations: []
    };

    // Generate field-by-field details
    for (const [fieldName, field] of Object.entries(validatedFields)) {
      if (fieldName.startsWith('overall') || fieldName.startsWith('total') || fieldName.startsWith('valid')) {
        continue;
      }

      const validators = this.getFieldValidators();
      report.fieldDetails[fieldName] = {
        value: field.value,
        confidence: field.finalConfidence,
        confidenceLevel: validators.getConfidenceLevel(field.finalConfidence),
        isValid: field.isValid,
        needsReview: field.needsReview,
        errors: field.validationErrors || [],
        extractionMethod: field.method,
        context: field.context ? field.context.substring(0, 100) + '...' : ''
      };
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations(summary, validatedFields);

    return report;
  }

  /**
   * Generate actionable recommendations based on validation results
   */
  generateRecommendations(summary, validatedFields) {
    const recommendations = [];

    // Overall confidence recommendations
    if (summary.averageConfidence < 50) {
      recommendations.push({
        type: 'critical',
        message: 'Overall confidence is very low. Consider manual review of entire document.',
        action: 'manual_review_all'
      });
    } else if (summary.averageConfidence < 70) {
      recommendations.push({
        type: 'warning',
        message: 'Overall confidence is moderate. Review high-priority fields.',
        action: 'selective_review'
      });
    }

    // Field-specific recommendations
    for (const issue of summary.criticalIssues) {
      recommendations.push({
        type: 'field_issue',
        message: `Field '${issue.field}' has critical issues: ${issue.errors.join(', ')}`,
        action: 'manual_review',
        field: issue.field
      });
    }

    // Cross-field consistency recommendations
    for (const warning of summary.warnings) {
      recommendations.push({
        type: 'consistency',
        message: warning,
        action: 'verify_consistency'
      });
    }

    // High review percentage recommendation
    const reviewPercentage = (summary.reviewRequired / summary.totalFields) * 100;
    if (reviewPercentage > 50) {
      recommendations.push({
        type: 'process',
        message: `${reviewPercentage.toFixed(1)}% of fields need review. Consider improving extraction patterns.`,
        action: 'improve_extraction'
      });
    }

    return recommendations;
  }
}

function getValidationHelpers() {
  if (typeof window === 'undefined' || !window.validationHelpersInstance) {
    if (typeof window !== 'undefined') {
      window.validationHelpersInstance = new ValidationHelpers();
    } else {
      return new ValidationHelpers();
    }
  }
  return window.validationHelpersInstance || new ValidationHelpers();
}
