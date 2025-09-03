/**
 * Settings Configuration Module
 * User preferences, output formatting, and advanced extraction settings
 */

class SettingsConfiguration {
  constructor() {
    this.properties = PropertiesService.getScriptProperties();
    this.outputFormatting = this.loadOutputFormatting();
    this.defaultAdvancedSettings = this.getDefaultAdvancedSettings();
  }
  
  /**
   * Get user-configurable parser settings
   */
  getSettings() {
    const stored = this.properties.getProperty('GNSS_SETTINGS');
    return stored ? JSON.parse(stored) : {
      confidence: { high: 85, medium: 70, low: 50, autoReject: 30 },
      fields: { enableAll: true }
    };
  }
  
  /**
   * Save user settings to persistent storage
   */
  saveSettings(settings) {
    this.properties.setProperty('GNSS_SETTINGS', JSON.stringify(settings));
  }
  
  /**
   * Get advanced extraction and proximity settings
   */
  getAdvancedSettings() {
    const stored = this.properties.getProperty('GNSS_ADVANCED_SETTINGS');
    return stored ? JSON.parse(stored) : this.defaultAdvancedSettings;
  }
  
  /**
   * Save advanced settings to persistent storage
   */
  saveAdvancedSettings(settings) {
    this.properties.setProperty('GNSS_ADVANCED_SETTINGS', JSON.stringify(settings));
  }

  /**
   * Get default advanced settings
   */
  getDefaultAdvancedSettings() {
    return {
      proximity: {
        maxDistance: 200,
        lineGap: 1,
        fuzzyThreshold: 80
      },
      sectionWeights: {
        performance: 40,
        technical: 35,
        features: 30,
        marketing: 10
      },
      methods: {
        enableOCR: true,
        enableProximity: true,
        enablePattern: true,
        enableAdaptive: true
      },
      fieldPriorities: [
        'dimensions', 'weight', 'operating_temperature', 'storage_temperature',
        'input_voltage', 'power_consumption', 'imu', 'accuracy', 'latency',
        'frequency', 'time_sync', 'measurement_types', 'ip_rating', 'channels',
        'constellations', 'interfaces', 'formats', 'warranty', 'product_description'
      ]
    };
  }

  /**
   * Load output formatting configuration for Google Sheets
   */
  loadOutputFormatting() {
    return {
      googleSheets: {
        columnMapping: {
          A: 'dimensions',
          B: 'weight', 
          C: 'operating_temperature',
          D: 'storage_temperature',
          E: 'input_voltage',
          F: 'power_consumption',
          G: 'imu',
          H: 'accuracy',
          I: 'latency',
          J: 'frequency',
          K: 'time_sync',
          L: 'measurement_types',
          M: 'ip_rating',
          N: 'channels',
          O: 'constellations',
          P: 'interfaces',
          Q: 'formats',
          R: 'warranty',
          S: 'firmware_options',
          T: 'product_description',
          U: 'confidence_score'
        },
        
        confidenceColors: {
          high: '#4CAF50',      // Green (85-100%)
          medium: '#FF9800',    // Orange (70-84%)
          low: '#F44336',       // Red (50-69%)
          veryLow: '#9E9E9E'    // Gray (<50%)
        },
        
        headers: [
          'Dimensions', 'Weight', 'Operating Temp', 'Storage Temp', 'Input Voltage',
          'Power', 'IMU', 'Accuracy', 'Latency', 'Frequency', 'Time Sync',
          'Measurements', 'IP Rating', 'Channels', 'Constellations', 'Interfaces',
          'Formats', 'Warranty', 'Firmware Options', 'Product Description', 'Confidence'
        ]
      },

      // Additional formatting options
      export: {
        csvSeparator: ',',
        dateFormat: 'yyyy-MM-dd',
        numberFormat: '0.00',
        booleanFormat: { true: 'Yes', false: 'No' }
      },

      display: {
        maxDescriptionLength: 200,
        abbreviateUnits: true,
        showConfidenceScore: true,
        highlightLowConfidence: true
      }
    };
  }

  /**
   * Get proximity detection settings
   */
  getProximitySettings() {
    return this.getAdvancedSettings().proximity;
  }

  /**
   * Get section priority weights for document analysis
   */
  getSectionWeights() {
    return this.getAdvancedSettings().sectionWeights;
  }

  /**
   * Get enabled extraction methods
   */
  getExtractionMethods() {
    return this.getAdvancedSettings().methods;
  }

  /**
   * Get custom field priority order (user-configurable)
   */
  getCustomFieldPriority() {
    const advanced = this.getAdvancedSettings();
    return advanced.fieldPriorities || this.getDefaultFieldPriority();
  }

  /**
   * Get default field priority order
   */
  getDefaultFieldPriority() {
    return [
      'dimensions', 'weight', 'operating_temperature', 'storage_temperature',
      'input_voltage', 'power_consumption', 'imu', 'accuracy', 'latency',
      'frequency', 'time_sync', 'measurement_types', 'ip_rating', 'channels',
      'constellations', 'interfaces', 'formats', 'warranty', 'firmware_options',
      'product_description'
    ];
  }

  /**
   * Get Google Sheets column mapping
   */
  getColumnMapping() {
    return this.outputFormatting.googleSheets.columnMapping;
  }

  /**
   * Get confidence color scheme for visualization
   */
  getConfidenceColors() {
    return this.outputFormatting.googleSheets.confidenceColors;
  }

  /**
   * Get headers for Google Sheets output
   */
  getSheetHeaders() {
    return this.outputFormatting.googleSheets.headers;
  }

  /**
   * Get export formatting options
   */
  getExportFormatting() {
    return this.outputFormatting.export;
  }

  /**
   * Get display formatting options
   */
  getDisplayFormatting() {
    return this.outputFormatting.display;
  }

  /**
   * Update proximity settings
   */
  updateProximitySettings(proximitySettings) {
    const advanced = this.getAdvancedSettings();
    advanced.proximity = { ...advanced.proximity, ...proximitySettings };
    this.saveAdvancedSettings(advanced);
  }

  /**
   * Update section weights
   */
  updateSectionWeights(sectionWeights) {
    const advanced = this.getAdvancedSettings();
    advanced.sectionWeights = { ...advanced.sectionWeights, ...sectionWeights };
    this.saveAdvancedSettings(advanced);
  }

  /**
   * Update extraction methods
   */
  updateExtractionMethods(methods) {
    const advanced = this.getAdvancedSettings();
    advanced.methods = { ...advanced.methods, ...methods };
    this.saveAdvancedSettings(advanced);
  }

  /**
   * Update field priorities
   */
  updateFieldPriorities(fieldPriorities) {
    const advanced = this.getAdvancedSettings();
    advanced.fieldPriorities = fieldPriorities;
    this.saveAdvancedSettings(advanced);
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults() {
    this.properties.deleteProperty('GNSS_SETTINGS');
    this.properties.deleteProperty('GNSS_ADVANCED_SETTINGS');
  }

  /**
   * Export all settings as JSON
   */
  exportSettings() {
    return {
      basic: this.getSettings(),
      advanced: this.getAdvancedSettings(),
      formatting: this.outputFormatting
    };
  }

  /**
   * Import settings from JSON
   */
  importSettings(settingsJson) {
    try {
      if (settingsJson.basic) {
        this.saveSettings(settingsJson.basic);
      }
      if (settingsJson.advanced) {
        this.saveAdvancedSettings(settingsJson.advanced);
      }
      // Note: formatting is not user-configurable via import
      return { success: true, message: 'Settings imported successfully' };
    } catch (error) {
      return { success: false, message: `Import failed: ${error.message}` };
    }
  }

  /**
   * Validate settings format
   */
  validateSettings(settings) {
    const errors = [];

    if (settings.basic) {
      const basic = settings.basic;
      if (basic.confidence) {
        const conf = basic.confidence;
        if (conf.high <= conf.medium || conf.medium <= conf.low || conf.low <= conf.autoReject) {
          errors.push('Confidence thresholds must be in descending order');
        }
        if (conf.autoReject < 0 || conf.high > 100) {
          errors.push('Confidence values must be between 0 and 100');
        }
      }
    }

    if (settings.advanced) {
      const advanced = settings.advanced;
      if (advanced.proximity) {
        const prox = advanced.proximity;
        if (prox.maxDistance < 1 || prox.maxDistance > 1000) {
          errors.push('Proximity max distance must be between 1 and 1000');
        }
        if (prox.fuzzyThreshold < 0 || prox.fuzzyThreshold > 100) {
          errors.push('Fuzzy threshold must be between 0 and 100');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

function getSettingsConfiguration() {
  if (typeof window === 'undefined' || !window.settingsConfigInstance) {
    if (typeof window !== 'undefined') {
      window.settingsConfigInstance = new SettingsConfiguration();
    } else {
      return new SettingsConfiguration();
    }
  }
  return window.settingsConfigInstance || new SettingsConfiguration();
}
