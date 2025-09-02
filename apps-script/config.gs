/**
 * GNSS PDF Parser Configuration Module
 * Loads field patterns, validation rules, and formatting from framework files
 */

class ParserConfig {
  constructor() {
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
          /(?i)\b(Dimensions?|Size|Device size|Housing|Physical dimensions?)\b/,
          /(?i)\b(L\s*[×x]\s*W\s*[×x]\s*H|Length\s*[×x]\s*Width\s*[×x]\s*Height)\b/
        ],
        valuePatterns: [
          /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s*[×x*]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s*[×x*]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?/gi,
          /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*mm/gi
        ],
        unit: "mm",
        format: "{L} × {W} × {H} mm"
      },
      
      weight: {
        aliases: ["Weight", "Mass"],
        labelPatterns: [
          /(?i)\b(Weight|Mass)\b/
        ],
        valuePatterns: [
          /(\d+(?:[.,]\d+)?)\s*(g|kg|grams?|kilograms?)\b/gi,
          /(\d+(?:[.,]\d+)?)\s*g\b/gi
        ],
        unit: "g",
        format: "{value} g"
      },

      operating_temperature: {
        aliases: ["Operating temperature", "Operating temp", "Temperature range", "Ambient temperature"],
        labelPatterns: [
          /(?i)\b(Operating temp(?:erature)?|Temperature range|Ambient temp(?:erature)?)\b/,
          /(?i)\b(Environmental|Temp\.?\s*range)\b/
        ],
        valuePatterns: [
          /([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|C|deg\s*C)?\s*to\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|C|deg\s*C)/gi,
          /([-+]?\d+(?:[.,]\d+)?)\s*[~–-]\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|C)/gi
        ],
        unit: "°C",
        format: "{min}°C to {max}°C"
      },

      storage_temperature: {
        aliases: ["Storage temperature", "Storage temp"],
        labelPatterns: [
          /(?i)\b(Storage temp(?:erature)?)\b/
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
          /(?i)\b(Input voltage|Voltage range|Supply voltage|Power supply)\b/,
          /(?i)\b(VDC|VAC|Voltage)\b/
        ],
        valuePatterns: [
          /(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V)/gi,
          /(\d+(?:[.,]\d+)?)\s*(?:to|~)\s*(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V)/gi
        ],
        unit: "VDC",
        format: "{min}–{max} {unit}"
      },

      power_consumption: {
        aliases: ["Power consumption", "Typical power", "Max power", "Consumption"],
        labelPatterns: [
          /(?i)\b(Power consumption|Typical power|Max power|Consumption)\b/,
          /(?i)\b(Power|Watts?|W)\b/
        ],
        valuePatterns: [
          /(\d+(?:[.,]\d+)?)\s*(W|watts?)\b/gi,
          /(\d+(?:[.,]\d+)?)\s*W\s*(?:typical|max|maximum)?/gi
        ],
        unit: "W",
        format: "{value} W"
      },

      imu: {
        aliases: ["IMU", "INS", "Inertial measurement", "Inertial sensors", "AHRS"],
        labelPatterns: [
          /(?i)\b(IMU|INS|Inertial|AHRS)\b/,
          /(?i)\b(Inertial measurement|Inertial sensors)\b/
        ],
        valuePatterns: [
          /(?i)\b(MEMS|tactical|navigation|6-axis|9-axis|IMU|INS)\b/,
          /(?i)\b(yes|no|available|included|optional)\b/
        ],
        unit: "text",
        format: "{description}"
      },

      accuracy: {
        aliases: ["Accuracy", "Position accuracy", "Horizontal accuracy", "RTK accuracy"],
        labelPatterns: [
          /(?i)\b(Accuracy|Position accuracy|Horizontal accuracy|RTK accuracy)\b/,
          /(?i)\b(RTK|DGPS|Precision)\b/
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
          /(?i)\b(Latency|Output latency|Data latency)\b/
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
          /(?i)\b(Update rate|Measurement rate|Position rate|Frequency)\b/,
          /(?i)\b(Hz|hertz)\b/
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
          /(?i)\b(Timing|Time sync|1PPS|PPS|Pulse)\b/
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
          /(?i)\b(Measurements?|Observables?|Supported measurements?)\b/
        ],
        valuePatterns: [
          /(?i)\b(RTK|PPP|DGPS|SBAS|Standalone)\b/,
          /(?i)\b(Pseudorange|Carrier phase|Doppler)\b/
        ],
        unit: "list",
        format: "{types}"
      },

      ip_rating: {
        aliases: ["IP rating", "Protection", "Environmental rating", "Ruggedness"],
        labelPatterns: [
          /(?i)\b(IP\s*rating|Protection|Environmental rating)\b/
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
          /(?i)\b(Channels?|Tracking channels?|Number of channels?)\b/
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
          /(?i)\b(Constellations?|GNSS signals?|Signals tracked|Nav systems?)\b/
        ],
        valuePatterns: [
          /(?i)\b(GPS|GLONASS|Galileo|BeiDou|QZSS|NavIC|SBAS)\b/,
          /(?i)\b(L1|L2|L5|E1|E5a?|E5b?|B1|B2)\b/
        ],
        unit: "constellation list",
        format: "{constellations}"
      },

      interfaces: {
        aliases: ["Interfaces", "Connectivity", "I/O", "Ports", "Communication"],
        labelPatterns: [
          /(?i)\b(Interfaces?|Connectivity|I\/O|Ports?|Communication)\b/
        ],
        valuePatterns: [
          /(?i)\b(RS-?232|RS-?422|USB|Ethernet|CAN|Wi-?Fi|Bluetooth)\b/,
          /(?i)\b(TCP\/IP|UDP|NMEA|Serial)\b/
        ],
        unit: "interface list",
        format: "{interfaces}"
      },

      formats: {
        aliases: ["Formats", "Output formats", "Data formats", "File formats"],
        labelPatterns: [
          /(?i)\b(Formats?|Output formats?|Data formats?)\b/
        ],
        valuePatterns: [
          /(?i)\b(RTCM|RINEX|NMEA|SBF|UBX|CMR|SPARTN)\b/,
          /(?i)\b(NMEA\s*0183|NMEA\s*2000|RTCM\s*v?3)\b/
        ],
        unit: "format list",
        format: "{formats}"
      },

      warranty: {
        aliases: ["Warranty", "Guarantee", "Service", "Warranty period"],
        labelPatterns: [
          /(?i)\b(Warranty|Guarantee|Service|Warranty period)\b/
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
          /(?i)\b(Options?|Variants?|Firmware options?|Software options?)\b/
        ],
        valuePatterns: [
          /(?i)\b(Pro\+?|ProBase|Standard|Base|Professional)\b/,
          /(?i)\b(IMU|L-band|RTK|PPP|option)\b/
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
}

// Export for use in other modules
var CONFIG = new ParserConfig();
