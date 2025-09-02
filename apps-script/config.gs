/**
 * GNSS PDF Parser Configuration Module
 * Loads field patterns, validation rules, and formatting from framework files
 */

/**
 * Settings Manager for user-configurable parser options
 */
class SettingsManager {
  constructor() {
    this.properties = PropertiesService.getScriptProperties();
  }
  
  getSettings() {
    const stored = this.properties.getProperty('GNSS_SETTINGS');
    return stored ? JSON.parse(stored) : {
      confidence: { high: 85, medium: 70, low: 50, autoReject: 30 },
      fields: { enableAll: true }
    };
  }
  
  saveSettings(settings) {
    this.properties.setProperty('GNSS_SETTINGS', JSON.stringify(settings));
  }
  
  getAdvancedSettings() {
    const stored = this.properties.getProperty('GNSS_ADVANCED_SETTINGS');
    return stored ? JSON.parse(stored) : {
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
        'constellations', 'interfaces', 'formats', 'warranty'
      ]
    };
  }
  
  saveAdvancedSettings(settings) {
    this.properties.setProperty('GNSS_ADVANCED_SETTINGS', JSON.stringify(settings));
  }
}

class ParserConfig {
  constructor() {
    this.settingsManager = new SettingsManager();
    this.userSettings = this.settingsManager.getSettings();
    this.advancedSettings = this.settingsManager.getAdvancedSettings();
    this.fieldPatterns = this.loadFieldPatterns();
    this.validationRules = this.loadValidationRules();
    this.outputFormatting = this.loadOutputFormatting();
    this.fieldPriority = this.loadFieldPriority();
  }

  /**
   * Load field aliases and regex patterns from framework configuration
   */
  loadFieldPatterns() {
    return {
      dimensions: {
        aliases: ["Dimensions", "Size", "Device size", "Housing", "Physical dimensions"],
        labelPatterns: [
          /\b(dimensions?|size|device\s+size|housing|physical\s+dimensions?)\b/i,
          /\b(l\s*[×x]\s*w\s*[×x]\s*h|length\s*[×x]\s*width\s*[×x]\s*height)\b/i
        ],
        valuePatterns: [
          // Enhanced: support multiple separators (×, x, *, ·, space) and varying unit spacing
          /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s*[×x*·]+\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s*[×x*·]+\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?/gi,
          // Space-separated format: "135mm 102mm 47mm" or "135 102 47"
          /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s+(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s+(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?/gi,
          /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*mm/gi
        ],
        unit: "mm",
        format: "{L} × {W} × {H} mm"
      },
      
      weight: {
        aliases: ["Weight", "Mass"],
        labelPatterns: [
          /\b(weight|mass)\b/i
        ],
        valuePatterns: [
          // Enhanced: support dual units "500 g / 1.1 lb" and varying spacing
          /(\d+(?:[.,]\d+)?)\s*(g|grams?)\s*\/\s*\d+(?:[.,]\d+)?\s*(?:lb|pound|oz|ounce)/gi,
          /(\d+(?:[.,]\d+)?)\s*(g|kg|grams?|kilograms?|pound|lb|oz|ounce)\b/gi,
          /(\d+(?:[.,]\d+)?)\s*g\b/gi
        ],
        unit: "g",
        format: "{value} g"
      },

      operating_temperature: {
        aliases: ["Operating temperature", "Operating temp", "Temperature range", "Ambient temperature"],
        labelPatterns: [
          /\b(operating\s+temp(?:erature)?|temperature\s+range|ambient\s+temp(?:erature)?)\b/i,
          /\b(environmental|temp\.?\s*range)\b/i
        ],
        valuePatterns: [
          // Enhanced: support multiple separators (-, –, ~, to, /) and approximation symbols
          /([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|°\s*C|C|deg\s*C)?\s*(?:to|–|-|~|\/)\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|°\s*C|C|deg\s*C)/gi,
          /([-+]?\d+(?:[.,]\d+)?)\s*[~–-]\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|C)/gi,
          // Single temperature with approximation: "~25°C", "≈ 85°C"
          /[≈~]?\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|°\s*C|C)/gi
        ],
        unit: "°C",
        format: "{min}°C to {max}°C"
      },

      storage_temperature: {
        aliases: ["Storage temperature", "Storage temp"],
        labelPatterns: [
          /\b(storage\s+temp(?:erature)?)\b/i
        ],
        valuePatterns: [
          /([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|C)?\s*to\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|C)/gi
        ],
        unit: "°C",
        format: "{min}°C to {max}°C"
      },

      input_voltage: {
        aliases: ["Input voltage", "Voltage range", "Supply voltage", "Power supply"],
        labelPatterns: [
          /\b(input\s+voltage|voltage\s+range|supply\s+voltage|power\s+supply)\b/i,
          /\b(vdc|vac|voltage)\b/i
        ],
        valuePatterns: [
          // Enhanced: support positive prefix cleaning and multiple separators
          /(\d+(?:[.,]\d+)?)\s*[–-~to\/]\s*(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V|VCC|volts?)/gi,
          /(\d+(?:[.,]\d+)?)\s*(?:to|~)\s*(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V)/gi,
          // Single voltage with unit spacing: "12 V", "3.3VDC"
          /(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V|VCC|volts?)\b/gi
        ],
        unit: "VDC",
        format: "{min}–{max} {unit}"
      },

      power_consumption: {
        aliases: ["Power consumption", "Typical power", "Max power", "Consumption"],
        labelPatterns: [
          /\b(power\s+consumption|typical\s+power|max\s+power|consumption)\b/i,
          /\b(power|watts?|w)\b/i
        ],
        valuePatterns: [
          // Enhanced: support approximation symbols and unit spacing variations
          /[≈~]?\s*(\d+(?:[.,]\d+)?)\s*(?:mA|mW|W|watts?|milliwatts?|milliamps?)\b/gi,
          /(\d+(?:[.,]\d+)?)\s*(W|watts?)\b/gi,
          /(\d+(?:[.,]\d+)?)\s*W\s*(?:typical|max|maximum|\(typ\))?/gi
        ],
        unit: "W",
        format: "{value} W"
      },

      imu: {
        aliases: ["IMU", "INS", "Inertial measurement", "Inertial sensors", "AHRS"],
        labelPatterns: [
          /\b(imu|ins|inertial|ahrs)\b/i,
          /\b(inertial\s+measurement|inertial\s+sensors)\b/i
        ],
        valuePatterns: [
          /\b(mems|tactical|navigation|6-axis|9-axis|imu|ins)\b/i,
          /\b(yes|no|available|included|optional)\b/i
        ],
        unit: "text",
        format: "{description}"
      },

      accuracy: {
        aliases: ["Accuracy", "Position accuracy", "Horizontal accuracy", "RTK accuracy"],
        labelPatterns: [
          /\b(accuracy|position\s+accuracy|horizontal\s+accuracy|rtk\s+accuracy)\b/i,
          /\b(rtk|dgps|precision)\b/i
        ],
        valuePatterns: [
          /(\d+(?:[.,]\d+)?)\s*(cm|mm|m)\s*(?:\+\s*(\d+(?:[.,]\d+)?)\s*ppm)?/gi,
          /(?:Horizontal?:?\s*)?(\d+(?:[.,]\d+)?)\s*(cm|mm)\s*(?:\+\s*(\d+(?:[.,]\d+)?)\s*ppm)?/gi
        ],
        unit: "cm",
        format: "{horizontal} cm + {ppm} ppm"
      },

      latency: {
        aliases: ["Latency", "Output latency", "Data latency", "Position latency"],
        labelPatterns: [
          /\b(latency|output\s+latency|data\s+latency)\b/i
        ],
        valuePatterns: [
          /(\d+(?:[.,]\d+)?)\s*(ms|milliseconds?)\b/gi,
          /<\s*(\d+(?:[.,]\d+)?)\s*(ms|milliseconds?)/gi
        ],
        unit: "ms",
        format: "{value} ms"
      },

      frequency: {
        aliases: ["Update rate", "Measurement rate", "Position rate", "Frequency"],
        labelPatterns: [
          /\b(update\s+rate|measurement\s+rate|position\s+rate|frequency)\b/i,
          /\b(hz|hertz)\b/i
        ],
        valuePatterns: [
          /(\d+(?:[.,]\d+)?)\s*(Hz|hertz)\b/gi,
          /Position\s*(?:and\s*attitude\s*)?(\d+(?:[.,]\d+)?)\s*(?:\/\s*(\d+(?:[.,]\d+)?))?\s*Hz/gi
        ],
        unit: "Hz",
        format: "{rate} Hz"
      },

      time_sync: {
        aliases: ["Timing", "Time sync", "Time transfer", "1PPS", "Pulse-per-second"],
        labelPatterns: [
          /\b(timing|time\s+sync|1pps|pps|pulse)\b/i
        ],
        valuePatterns: [
          /(\d+(?:[.,]\d+)?)\s*(ns|μs|nanoseconds?|microseconds?)\b/gi,
          /(?:±\s*)?(\d+(?:[.,]\d+)?)\s*(ns|μs)\s*(?:RMS|UTC)?/gi
        ],
        unit: "ns",
        format: "{accuracy} ns RMS"
      },

      measurement_types: {
        aliases: ["Measurements", "Observables", "Supported measurements"],
        labelPatterns: [
          /\b(measurements?|observables?|supported\s+measurements?)\b/i
        ],
        valuePatterns: [
          /\b(rtk|ppp|dgps|sbas|standalone)\b/i,
          /\b(pseudorange|carrier\s+phase|doppler)\b/i
        ],
        unit: "list",
        format: "{types}"
      },

      ip_rating: {
        aliases: ["IP rating", "Protection", "Environmental rating", "Ruggedness"],
        labelPatterns: [
          /\b(ip\s*rating|protection|environmental\s+rating)\b/i
        ],
        valuePatterns: [
          /\b(IP\s*\d{2}[KX]?)\b/gi,
          /\b(IP\s*6[5-9]|IP\s*67|IP\s*68|IP\s*69K?)\b/gi
        ],
        unit: "IP code",
        format: "{rating}"
      },

      channels: {
        aliases: ["Channels", "Tracking channels", "Number of channels", "Hardware channels"],
        labelPatterns: [
          /\b(channels?|tracking\s+channels?|number\s+of\s+channels?)\b/i
        ],
        valuePatterns: [
          /(\d{2,4})\s*(?:channels?|CH)\b/gi,
          /(?:up to\s*)?(\d{2,4})\s*(?:tracking\s*)?channels?/gi
        ],
        unit: "channels",
        format: "{count} channels"
      },

      constellations: {
        aliases: ["Constellations", "GNSS signals", "Signals tracked", "Nav systems"],
        labelPatterns: [
          /\b(constellations?|gnss\s+signals?|signals\s+tracked|nav\s+systems?)\b/i
        ],
        valuePatterns: [
          /\b(gps|glonass|galileo|beidou|qzss|navic|sbas)\b/i,
          /\b(l1|l2|l5|e1|e5a?|e5b?|b1|b2)\b/i
        ],
        unit: "constellation list",
        format: "{constellations}"
      },

      interfaces: {
        aliases: ["Interfaces", "Connectivity", "I/O", "Ports", "Communication"],
        labelPatterns: [
          /\b(interfaces?|connectivity|i\/o|ports?|communication)\b/i
        ],
        valuePatterns: [
          /\b(rs-?232|rs-?422|usb|ethernet|can|wi-?fi|bluetooth)\b/i,
          /\b(tcp\/ip|udp|nmea|serial)\b/i
        ],
        unit: "interface list",
        format: "{interfaces}"
      },

      formats: {
        aliases: ["Formats", "Output formats", "Data formats", "File formats"],
        labelPatterns: [
          /\b(formats?|output\s+formats?|data\s+formats?)\b/i
        ],
        valuePatterns: [
          /\b(rtcm|rinex|nmea|sbf|ubx|cmr|spartn)\b/i,
          /\b(nmea\s*0183|nmea\s*2000|rtcm\s*v?3)\b/i
        ],
        unit: "format list",
        format: "{formats}"
      },

      warranty: {
        aliases: ["Warranty", "Guarantee", "Service", "Warranty period"],
        labelPatterns: [
          /\b(warranty|guarantee|service|warranty\s+period)\b/i
        ],
        valuePatterns: [
          /(\d+)\s*(years?|months?|yrs?|mo)\b/gi,
          /(\d+)\s*year\s*(?:limited\s*)?warranty/gi
        ],
        unit: "years",
        format: "{period} {unit}"
      },

      firmware_options: {
        aliases: ["Options", "Variants", "Firmware options", "Software options"],
        labelPatterns: [
          /\b(options?|variants?|firmware\s+options?|software\s+options?)\b/i
        ],
        valuePatterns: [
          /\b(pro\+?|probase|standard|base|professional)\b/i,
          /\b(imu|l-band|rtk|ppp|option)\b/i
        ],
        unit: "option list",
        format: "{options}"
      }
    };
  }

  /**
   * Load validation rules and confidence thresholds
   */
  loadValidationRules() {
    const settings = this.userSettings;
    
    return {
      global: {
        requiredConfidenceMinimum: settings.confidence.low,
        autoRejectBelow: settings.confidence.autoReject,
        manualReviewThreshold: settings.confidence.medium,
        highConfidenceThreshold: settings.confidence.high,
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
   * Load output formatting configuration
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
          T: 'confidence_score'
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
          'Formats', 'Warranty', 'Firmware Options', 'Confidence'
        ]
      }
    };
  }

  /**
   * Load field extraction priority order
   */
  loadFieldPriority() {
    return [
      'dimensions', 'weight', 'operating_temperature', 'storage_temperature',
      'input_voltage', 'power_consumption', 'imu', 'accuracy', 'latency',
      'frequency', 'time_sync', 'measurement_types', 'ip_rating', 'channels',
      'constellations', 'interfaces', 'formats', 'warranty', 'firmware_options'
    ];
  }

  /**
   * Get all 18 field names in priority order
   */
  getFieldNames() {
    return this.fieldPriority;
  }

  /**
   * Get pattern configuration for a specific field
   */
  getFieldConfig(fieldName) {
    return this.fieldPatterns[fieldName];
  }

  /**
   * Get validation rules for a specific field
   */
  getFieldValidation(fieldName) {
    return this.validationRules.fieldRules[fieldName];
  }

  /**
   * Get advanced proximity settings
   */
  getProximitySettings() {
    return this.advancedSettings.proximity;
  }

  /**
   * Get section priority weights
   */
  getSectionWeights() {
    return this.advancedSettings.sectionWeights;
  }

  /**
   * Get extraction method settings
   */
  getExtractionMethods() {
    return this.advancedSettings.methods;
  }

  /**
   * Get field priority order (may be customized by user)
   */
  getCustomFieldPriority() {
    return this.advancedSettings.fieldPriorities || this.fieldPriority;
  }
}

// Export for use in other modules
var CONFIG = new ParserConfig();
