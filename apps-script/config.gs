/**
 * Configuration Module Interface
 * Coordinates parser and settings configuration
 */

class ConfigurationInterface {
  constructor() {
    this.parserConfig = null;
    this.settingsConfig = null;
  }

  /**
   * Get parser configuration instance
   */
  getParserConfig() {
    if (!this.parserConfig) {
      try {
        this.parserConfig = getParserConfiguration();
      } catch (error) {
        console.warn('ParserConfiguration not available, using fallback');
        this.parserConfig = this.createFallbackParserConfig();
      }
    }
    return this.parserConfig;
  }

  /**
   * Get settings configuration instance
   */
  getSettingsConfig() {
    if (!this.settingsConfig) {
      try {
        this.settingsConfig = getSettingsConfiguration();
      } catch (error) {
        console.warn('SettingsConfiguration not available, using fallback');
        this.settingsConfig = this.createFallbackSettingsConfig();
      }
    }
    return this.settingsConfig;
  }

  /**
   * Create fallback parser configuration
   */
  createFallbackParserConfig() {
    return {
      getFieldNames: () => ['dimensions', 'weight', 'operating_temperature'],
      getFieldConfig: () => ({ aliases: [], labelPatterns: [], valuePatterns: [] }),
      getFieldValidation: () => ({ required: false }),
      getAllFieldPatterns: () => ({}),
      getAllValidationRules: () => ({ global: {}, fieldRules: {} })
    };
  }

  /**
   * Create fallback settings configuration
   */
  createFallbackSettingsConfig() {
    return {
      getSettings: () => ({ confidence: { high: 85, medium: 70, low: 50, autoReject: 30 } }),
      getAdvancedSettings: () => ({ proximity: {}, methods: {} }),
      getProximitySettings: () => ({ maxDistance: 200 }),
      getSectionWeights: () => ({ performance: 40, technical: 35 }),
      getExtractionMethods: () => ({ enableOCR: true }),
      getCustomFieldPriority: () => ['dimensions', 'weight']
    };
  }

  // Delegate methods to parser configuration
  getFieldNames() {
    return this.getParserConfig().getFieldNames();
  }

  getFieldConfig(fieldName) {
    return this.getParserConfig().getFieldConfig(fieldName);
  }

  getFieldValidation(fieldName) {
    return this.getParserConfig().getFieldValidation(fieldName);
  }

  getAllFieldPatterns() {
    return this.getParserConfig().getAllFieldPatterns();
  }

  getAllValidationRules() {
    return this.getParserConfig().getAllValidationRules();
  }

  // Delegate methods to settings configuration
  getSettings() {
    return this.getSettingsConfig().getSettings();
  }

  getAdvancedSettings() {
    return this.getSettingsConfig().getAdvancedSettings();
  }

  getProximitySettings() {
    return this.getSettingsConfig().getProximitySettings();
  }

  getSectionWeights() {
    return this.getSettingsConfig().getSectionWeights();
  }

  getExtractionMethods() {
    return this.getSettingsConfig().getExtractionMethods();
  }

  getCustomFieldPriority() {
    return this.getSettingsConfig().getCustomFieldPriority();
  }

  getColumnMapping() {
    return this.getSettingsConfig().getColumnMapping();
  }

  getConfidenceColors() {
    return this.getSettingsConfig().getConfidenceColors();
  }

  getSheetHeaders() {
    return this.getSettingsConfig().getSheetHeaders();
  }

  // Convenience methods
  get fieldPatterns() {
    return this.getAllFieldPatterns();
  }

  get validationRules() {
    return this.getAllValidationRules();
  }

  get fieldPriority() {
    return this.getCustomFieldPriority();
  }

  get outputFormatting() {
    return {
      googleSheets: {
        columnMapping: this.getColumnMapping(),
        confidenceColors: this.getConfidenceColors(),
        headers: this.getSheetHeaders()
      }
    };
  }
}

// Export for backward compatibility
try {
  var CONFIG = new ConfigurationInterface();
} catch (error) {
  console.error('Error initializing CONFIG interface:', error);
  var CONFIG = {
    getFieldNames: function() {
      return ['dimensions', 'weight', 'operating_temperature'];
    },
    getFieldConfig: function() {
      return { aliases: [], labelPatterns: [], valuePatterns: [] };
    }
  };
}
