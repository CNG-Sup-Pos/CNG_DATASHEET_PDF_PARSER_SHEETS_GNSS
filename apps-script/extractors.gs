/**
 * GNSS PDF Parser Field Extractors
 * 18 specialized field extraction functions using regex patterns
 */

class FieldExtractors {
  constructor() {
    // Lazy load config to avoid initialization order issues
    this.config = null;
  }

  getConfig() {
    if (!this.config) {
      this.config = CONFIG;
    }
    return this.config;
  }

  /**
   * Extract all 18 fields from PDF text
   */
  extractAllFields(pdfText) {
    const results = {};
    const fieldNames = this.getConfig().getFieldNames();
    
    for (const fieldName of fieldNames) {
      try {
        results[fieldName] = this.extractField(fieldName, pdfText);
      } catch (error) {
        console.error(`Error extracting ${fieldName}:`, error);
        results[fieldName] = {
          value: null,
          confidence: 0,
          context: '',
          error: error.message
        };
      }
    }
    
    return results;
  }

  /**
   * Extract a specific field using its configuration
   */
  extractField(fieldName, pdfText) {
    const fieldConfig = this.getConfig().getFieldConfig(fieldName);
    if (!fieldConfig) {
      throw new Error(`No configuration found for field: ${fieldName}`);
    }

    // Find potential value matches
    const candidates = this.findValueCandidates(pdfText, fieldConfig);
    
    // Score and select best candidate
    const bestCandidate = this.selectBestCandidate(candidates, fieldConfig);
    
    // Normalize the extracted value
    const normalized = this.normalizeValue(bestCandidate, fieldConfig);
    
    return {
      value: normalized.value,
      confidence: normalized.confidence,
      context: bestCandidate ? bestCandidate.context : '',
      method: normalized.method || 'regex_pattern',
      rawValue: bestCandidate ? bestCandidate.raw : null
    };
  }

  /**
   * Find all potential value candidates using label and value patterns
   */
  findValueCandidates(text, fieldConfig) {
    const candidates = [];
    
    // Method 1: Label-based extraction (preferred)
    const labelCandidates = this.findLabelBasedCandidates(text, fieldConfig);
    candidates.push(...labelCandidates);
    
    // Method 2: Pattern-based extraction (fallback)
    const patternCandidates = this.findPatternBasedCandidates(text, fieldConfig);
    candidates.push(...patternCandidates);
    
    return candidates;
  }

  /**
   * Find candidates by locating labels and nearby values
   */
  findLabelBasedCandidates(text, fieldConfig) {
    const candidates = [];
    const lines = text.split('\n');
    
    for (const labelPattern of fieldConfig.labelPatterns) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const labelMatch = line.match(labelPattern);
        
        if (labelMatch) {
          // Look for values on same line
          const sameLineValues = this.extractValuesFromLine(line, fieldConfig);
          for (const value of sameLineValues) {
            candidates.push({
              raw: value.raw,
              normalized: value.normalized,
              confidence: value.confidence + 20, // Bonus for label proximity
              context: line.trim(),
              method: 'label_same_line',
              lineNumber: i
            });
          }
          
          // Look for values in next 3 lines
          for (let j = 1; j <= 3 && (i + j) < lines.length; j++) {
            const nextLine = lines[i + j];
            const nextLineValues = this.extractValuesFromLine(nextLine, fieldConfig);
            for (const value of nextLineValues) {
              candidates.push({
                raw: value.raw,
                normalized: value.normalized,
                confidence: value.confidence + (15 - j * 3), // Decreasing bonus for distance
                context: `${line.trim()} → ${nextLine.trim()}`,
                method: 'label_next_line',
                lineNumber: i + j
              });
            }
          }
        }
      }
    }
    
    return candidates;
  }

  /**
   * Find candidates using value patterns across entire text
   */
  findPatternBasedCandidates(text, fieldConfig) {
    const candidates = [];
    
    for (const pattern of fieldConfig.valuePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const confidence = this.calculatePatternConfidence(match, text, fieldConfig);
        
        candidates.push({
          raw: match[0],
          normalized: match[0],
          confidence: confidence,
          context: this.extractContext(text, match.index, 50),
          method: 'pattern_match',
          matchIndex: match.index
        });
        
        // Reset pattern to avoid infinite loop
        if (!pattern.global) break;
      }
    }
    
    return candidates;
  }

  /**
   * Extract values from a specific line using field patterns
   */
  extractValuesFromLine(line, fieldConfig) {
    const values = [];
    
    for (const pattern of fieldConfig.valuePatterns) {
      const matches = line.match(pattern) || [];
      for (const match of matches) {
        values.push({
          raw: match,
          normalized: match,
          confidence: 60 // Base confidence for line extraction
        });
      }
    }
    
    return values;
  }

  /**
   * Calculate confidence score for pattern matches
   */
  calculatePatternConfidence(match, text, fieldConfig) {
    let confidence = 50; // Base confidence
    
    // Bonus for complete pattern match
    if (match[0].length > 5) confidence += 10;
    
    // Bonus for units present
    if (fieldConfig.unit !== 'text' && match[0].includes(fieldConfig.unit)) {
      confidence += 15;
    }
    
    // Bonus for proximity to field aliases
    const context = this.extractContext(text, match.index, 100);
    for (const alias of fieldConfig.aliases) {
      if (context.toLowerCase().includes(alias.toLowerCase())) {
        confidence += 20;
        break;
      }
    }
    
    // Penalty for very short matches
    if (match[0].length < 3) confidence -= 20;
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Extract surrounding context for a match
   */
  extractContext(text, index, radius) {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + radius);
    return text.substring(start, end);
  }

  /**
   * Select the best candidate from all found candidates
   */
  selectBestCandidate(candidates, fieldConfig) {
    if (candidates.length === 0) return null;
    
    // Sort by confidence score (descending)
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    // Filter out very low confidence candidates
    const filtered = candidates.filter(c => c.confidence >= 30);
    
    if (filtered.length === 0) return candidates[0]; // Return best even if low confidence
    
    return filtered[0];
  }

  /**
   * Normalize extracted value according to field specification
   */
  normalizeValue(candidate, fieldConfig) {
    if (!candidate) {
      return {
        value: null,
        confidence: 0,
        method: 'no_match'
      };
    }

    const fieldType = fieldConfig.unit;
    let normalizedValue = candidate.raw;
    let confidence = candidate.confidence;

    try {
      switch (fieldType) {
        case 'mm':
          normalizedValue = this.normalizeDimensions(candidate.raw);
          break;
        case 'g':
          normalizedValue = this.normalizeWeight(candidate.raw);
          break;
        case '°C':
          normalizedValue = this.normalizeTemperature(candidate.raw);
          break;
        case 'VDC':
          normalizedValue = this.normalizeVoltage(candidate.raw);
          break;
        case 'W':
          normalizedValue = this.normalizePower(candidate.raw);
          break;
        case 'cm':
          normalizedValue = this.normalizeAccuracy(candidate.raw);
          break;
        case 'ms':
          normalizedValue = this.normalizeLatency(candidate.raw);
          break;
        case 'Hz':
          normalizedValue = this.normalizeFrequency(candidate.raw);
          break;
        case 'ns':
          normalizedValue = this.normalizeTimeSync(candidate.raw);
          break;
        case 'channels':
          normalizedValue = this.normalizeChannels(candidate.raw);
          break;
        case 'IP code':
          normalizedValue = this.normalizeIPRating(candidate.raw);
          break;
        default:
          normalizedValue = this.normalizeText(candidate.raw);
      }
      
      // Boost confidence if normalization was successful
      if (normalizedValue && normalizedValue !== candidate.raw) {
        confidence += 10;
      }
      
    } catch (error) {
      console.warn(`Normalization error for ${fieldConfig.unit}:`, error);
      confidence -= 20;
    }

    return {
      value: normalizedValue,
      confidence: Math.max(0, Math.min(100, confidence)),
      method: candidate.method
    };
  }

  /**
   * Normalize dimensions to standard format
   */
  normalizeDimensions(raw) {
    const match = raw.match(/(\d+(?:[.,]\d+)?)\s*[×x*]\s*(\d+(?:[.,]\d+)?)\s*[×x*]\s*(\d+(?:[.,]\d+)?)/);
    if (!match) return raw;
    
    const [, l, w, h] = match;
    const length = parseFloat(l.replace(',', '.'));
    const width = parseFloat(w.replace(',', '.'));
    const height = parseFloat(h.replace(',', '.'));
    
    return `${length} × ${width} × ${height} mm`;
  }

  /**
   * Normalize weight to grams
   */
  normalizeWeight(raw) {
    const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|grams?|kilograms?)/i);
    if (!match) return raw;
    
    const [, value, unit] = match;
    let weight = parseFloat(value.replace(',', '.'));
    
    if (unit.toLowerCase().startsWith('kg')) {
      weight *= 1000; // Convert kg to g
    }
    
    return `${weight} g`;
  }

  /**
   * Normalize temperature range
   */
  normalizeTemperature(raw) {
    const match = raw.match(/([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|C)?\s*(?:to|–|-|~)\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|C)?/);
    if (!match) return raw;
    
    const [, min, max] = match;
    const minTemp = parseFloat(min.replace(',', '.'));
    const maxTemp = parseFloat(max.replace(',', '.'));
    
    return `${minTemp}°C to ${maxTemp}°C`;
  }

  /**
   * Normalize voltage range
   */
  normalizeVoltage(raw) {
    const match = raw.match(/(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V)/i);
    if (!match) return raw;
    
    const [, min, max, unit] = match;
    const minVolt = parseFloat(min.replace(',', '.'));
    const maxVolt = parseFloat(max.replace(',', '.'));
    
    return `${minVolt}–${maxVolt} ${unit.toUpperCase()}`;
  }

  /**
   * Normalize power consumption
   */
  normalizePower(raw) {
    const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(W|watts?)/i);
    if (!match) return raw;
    
    const [, value] = match;
    const power = parseFloat(value.replace(',', '.'));
    
    return `${power} W`;
  }

  /**
   * Normalize accuracy specification
   */
  normalizeAccuracy(raw) {
    const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(cm|mm|m)\s*(?:\+\s*(\d+(?:[.,]\d+)?)\s*ppm)?/i);
    if (!match) return raw;
    
    const [, value, unit, ppm] = match;
    let accuracy = parseFloat(value.replace(',', '.'));
    
    // Convert to cm
    if (unit.toLowerCase() === 'mm') accuracy /= 10;
    if (unit.toLowerCase() === 'm') accuracy *= 100;
    
    let result = `${accuracy} cm`;
    if (ppm) {
      result += ` + ${parseFloat(ppm.replace(',', '.'))} ppm`;
    }
    
    return result;
  }

  /**
   * Normalize latency
   */
  normalizeLatency(raw) {
    const match = raw.match(/(?:<\s*)?(\d+(?:[.,]\d+)?)\s*(ms|milliseconds?)/i);
    if (!match) return raw;
    
    const [, value] = match;
    const latency = parseFloat(value.replace(',', '.'));
    
    return `${latency} ms`;
  }

  /**
   * Normalize frequency/update rate
   */
  normalizeFrequency(raw) {
    const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:\/\s*(\d+(?:[.,]\d+)?))?\s*(Hz|hertz)/i);
    if (!match) return raw;
    
    const [, rate1, rate2] = match;
    const frequency1 = parseFloat(rate1.replace(',', '.'));
    
    if (rate2) {
      const frequency2 = parseFloat(rate2.replace(',', '.'));
      return `${frequency1} Hz / ${frequency2} Hz`;
    }
    
    return `${frequency1} Hz`;
  }

  /**
   * Normalize time synchronization accuracy
   */
  normalizeTimeSync(raw) {
    const match = raw.match(/(?:±\s*)?(\d+(?:[.,]\d+)?)\s*(ns|μs|nanoseconds?|microseconds?)/i);
    if (!match) return raw;
    
    const [, value, unit] = match;
    let accuracy = parseFloat(value.replace(',', '.'));
    
    // Convert to ns
    if (unit.toLowerCase().startsWith('μs') || unit.toLowerCase().startsWith('microsecond')) {
      accuracy *= 1000;
    }
    
    return `${accuracy} ns RMS`;
  }

  /**
   * Normalize channel count
   */
  normalizeChannels(raw) {
    const match = raw.match(/(?:up to\s*)?(\d+)\s*(?:channels?|CH)?/i);
    if (!match) return raw;
    
    const [, count] = match;
    return `${count} channels`;
  }

  /**
   * Normalize IP rating
   */
  normalizeIPRating(raw) {
    const match = raw.match(/\b(IP\s*\d{2}[KX]?)\b/i);
    if (!match) return raw;
    
    return match[1].replace(/\s+/g, '').toUpperCase();
  }

  /**
   * Normalize text fields (lists, options, etc.)
   */
  normalizeText(raw) {
    return raw.trim().replace(/\s+/g, ' ');
  }
}

// Export for use in other modules
var EXTRACTORS = new FieldExtractors();
