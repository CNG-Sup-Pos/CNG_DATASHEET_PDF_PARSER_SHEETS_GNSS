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
   * Extract a specific field using its configuration with adaptive recovery
   */
  extractField(fieldName, pdfText) {
    const fieldConfig = this.getConfig().getFieldConfig(fieldName);
    if (!fieldConfig) {
      throw new Error(`No configuration found for field: ${fieldName}`);
    }

    // Try multi-tier adaptive field recovery
    return this.extractFieldWithRecovery(fieldName, pdfText, fieldConfig);
  }

  /**
   * Multi-Tier Adaptive Field Recovery System
   * Implements progressive fallback strategies for failed extractions
   */
  extractFieldWithRecovery(fieldName, pdfText, fieldConfig) {
    // Tier 1: Standard extraction
    let result = this.standardExtraction(fieldName, pdfText, fieldConfig);
    if (result.confidence >= 70) {
      result.recoveryTier = 1;
      return result;
    }
    
    // Tier 2: Relaxed pattern matching
    result = this.relaxedPatternExtraction(fieldName, pdfText, fieldConfig);
    if (result.confidence >= 50) {
      result.recoveryTier = 2;
      return result;
    }
    
    // Tier 3: Proximity-based recovery
    result = this.proximityRecovery(fieldName, pdfText, fieldConfig);
    if (result.confidence >= 30) {
      result.recoveryTier = 3;
      return result;
    }
    
    // Tier 4: Section-based extraction
    result = this.sectionBasedExtraction(fieldName, pdfText, fieldConfig);
    if (result.confidence >= 20) {
      result.recoveryTier = 4;
      return result;
    }
    
    // Tier 5: Document-wide fuzzy search
    result = this.documentWideSearch(fieldName, pdfText, fieldConfig);
    result.recoveryTier = 5;
    return result;
  }

  /**
   * Tier 1: Standard extraction (original method)
   */
  standardExtraction(fieldName, pdfText, fieldConfig) {
    try {
      // Find potential value matches using standard patterns
      const candidates = this.findValueCandidates(pdfText, fieldConfig);
      
      // Score and select best candidate
      const bestCandidate = this.selectBestCandidate(candidates, fieldConfig);
      
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'standard_extraction', rawValue: null };
      }
      
      // Normalize the extracted value
      const normalized = this.normalizeValue(bestCandidate, fieldConfig);
      
      return {
        value: normalized.value,
        confidence: normalized.confidence,
        context: bestCandidate.context,
        method: normalized.method || 'standard_extraction',
        rawValue: bestCandidate.raw
      };
    } catch (error) {
      return { value: null, confidence: 0, context: '', method: 'standard_extraction', rawValue: null, error: error.message };
    }
  }

  /**
   * Tier 2: Relaxed pattern matching with more permissive regex
   */
  relaxedPatternExtraction(fieldName, pdfText, fieldConfig) {
    try {
      const relaxedCandidates = [];
      
      // Generate relaxed patterns based on field type
      const relaxedPatterns = this.generateRelaxedPatterns(fieldName, fieldConfig);
      
      for (const pattern of relaxedPatterns) {
        let match;
        while ((match = pattern.exec(pdfText)) !== null) {
          const confidence = this.calculateRelaxedConfidence(match, pdfText, fieldConfig);
          
          relaxedCandidates.push({
            raw: match[0],
            normalized: match[0],
            confidence: confidence,
            context: this.extractContext(pdfText, match.index, 50),
            method: 'relaxed_pattern',
            matchIndex: match.index
          });
          
          if (!pattern.global) break;
        }
      }
      
      const bestCandidate = this.selectBestCandidate(relaxedCandidates, fieldConfig);
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'relaxed_pattern', rawValue: null };
      }
      
      const normalized = this.normalizeValue(bestCandidate, fieldConfig);
      return {
        value: normalized.value,
        confidence: Math.max(20, normalized.confidence - 10), // Penalty for relaxed extraction
        context: bestCandidate.context,
        method: 'relaxed_pattern',
        rawValue: bestCandidate.raw
      };
    } catch (error) {
      return { value: null, confidence: 0, context: '', method: 'relaxed_pattern', rawValue: null, error: error.message };
    }
  }

  /**
   * Tier 3: Proximity-based recovery - look for values near field aliases
   */
  proximityRecovery(fieldName, pdfText, fieldConfig) {
    try {
      // Special handling for product description
      if (fieldName === 'product_description') {
        return this.extractDescriptionFromDocument(pdfText, fieldConfig);
      }
      
      const lines = pdfText.split('\n');
      const candidates = [];
      const proximitySettings = this.getConfig().getProximitySettings();
      
      // Search for field aliases in text
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if line contains field aliases or starts with field name
        let foundAlias = false;
        for (const alias of fieldConfig.aliases) {
          if (line.toLowerCase().includes(alias.toLowerCase()) || 
              line.toLowerCase().startsWith(alias.toLowerCase())) {
            foundAlias = true;
            break;
          }
        }
        
        if (foundAlias) {
          // Look for values in current line first
          const currentLineValues = this.extractProximityValues(line, fieldConfig);
          for (const value of currentLineValues) {
            candidates.push({
              raw: value,
              normalized: value,
              confidence: 50, // Higher confidence for same-line values
              context: line.substring(0, 100),
              method: 'proximity_recovery',
              matchIndex: i
            });
          }
          
          // If no values in current line, look in nearby lines
          if (currentLineValues.length === 0) {
            const lineGap = proximitySettings.lineGap || 2; // Increased line gap
            const searchLines = [];
            
            // Add current line and nearby lines
            for (let j = Math.max(0, i - lineGap); j <= Math.min(lines.length - 1, i + lineGap); j++) {
              if (j !== i) { // Skip current line since we already checked it
                searchLines.push(lines[j].trim());
              }
            }
            
            const searchText = searchLines.join(' ');
            const proximityValues = this.extractProximityValues(searchText, fieldConfig);
            
            for (const value of proximityValues) {
              candidates.push({
                raw: value,
                normalized: value,
                confidence: 35, // Lower confidence for nearby lines
                context: (line + ' ' + searchText).substring(0, 100),
                method: 'proximity_recovery',
                matchIndex: i
              });
            }
          }
        }
      }
      
      const bestCandidate = this.selectBestCandidate(candidates, fieldConfig);
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'proximity_recovery', rawValue: null };
      }
      
      const normalized = this.normalizeValue(bestCandidate, fieldConfig);
      return {
        value: normalized.value,
        confidence: Math.max(15, normalized.confidence - 15), // Reduced penalty for proximity extraction
        context: bestCandidate.context,
        method: 'proximity_recovery',
        rawValue: bestCandidate.raw
      };
    } catch (error) {
      return { value: null, confidence: 0, context: '', method: 'proximity_recovery', rawValue: null, error: error.message };
    }
  }

  /**
   * Tier 4: Section-based extraction - look in prioritized document sections
   */
  sectionBasedExtraction(fieldName, pdfText, fieldConfig) {
    try {
      const sections = this.identifyDocumentSections(pdfText);
      const sectionWeights = this.getConfig().getSectionWeights();
      const candidates = [];
      
      // Search sections in priority order
      const prioritizedSections = Object.keys(sectionWeights).sort((a, b) => sectionWeights[b] - sectionWeights[a]);
      
      for (const sectionType of prioritizedSections) {
        if (sections[sectionType]) {
          const sectionText = sections[sectionType];
          const sectionValues = this.extractSectionValues(sectionText, fieldConfig, sectionType);
          
          for (const value of sectionValues) {
            const weight = sectionWeights[sectionType] || 10;
            candidates.push({
              raw: value,
              normalized: value,
              confidence: Math.min(35, weight), // Base confidence from section weight
              context: sectionText.substring(0, 100),
              method: 'section_based',
              section: sectionType
            });
          }
        }
      }
      
      const bestCandidate = this.selectBestCandidate(candidates, fieldConfig);
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'section_based', rawValue: null };
      }
      
      const normalized = this.normalizeValue(bestCandidate, fieldConfig);
      return {
        value: normalized.value,
        confidence: Math.max(10, normalized.confidence - 25), // Penalty for section extraction
        context: bestCandidate.context,
        method: 'section_based',
        rawValue: bestCandidate.raw
      };
    } catch (error) {
      return { value: null, confidence: 0, context: '', method: 'section_based', rawValue: null, error: error.message };
    }
  }

  /**
   * Tier 5: Document-wide fuzzy search - last resort broad pattern search
   */
  documentWideSearch(fieldName, pdfText, fieldConfig) {
    try {
      const candidates = [];
      
      // Generate very broad patterns for field type
      const broadPatterns = this.generateBroadPatterns(fieldName, fieldConfig);
      
      for (const pattern of broadPatterns) {
        let match;
        while ((match = pattern.exec(pdfText)) !== null) {
          candidates.push({
            raw: match[0],
            normalized: match[0],
            confidence: 15, // Low confidence for broad search
            context: this.extractContext(pdfText, match.index, 30),
            method: 'document_wide',
            matchIndex: match.index
          });
          
          if (!pattern.global) break;
        }
      }
      
      const bestCandidate = this.selectBestCandidate(candidates, fieldConfig);
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'document_wide', rawValue: null };
      }
      
      const normalized = this.normalizeValue(bestCandidate, fieldConfig);
      return {
        value: normalized.value,
        confidence: Math.max(5, normalized.confidence - 30), // Heavy penalty for document-wide search
        context: bestCandidate.context,
        method: 'document_wide',
        rawValue: bestCandidate.raw
      };
    } catch (error) {
      return { value: null, confidence: 0, context: '', method: 'document_wide', rawValue: null, error: error.message };
    }
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
        case 'text':
          // Handle product description specially
          if (fieldConfig.aliases && fieldConfig.aliases.includes('Description')) {
            normalizedValue = this.normalizeDescription(candidate.raw);
          } else {
            normalizedValue = this.normalizeText(candidate.raw);
          }
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
   * Enhanced for multiple separators and space-separated formats
   */
  normalizeDimensions(raw) {
    // Support multiple separators: x, ×, *, ·, space
    // Enhanced pattern for "274 mm x 185 mm x 17 mm" format
    const mmSpacedPattern = /(\d+(?:[.,]\d+)?)\s*mm\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*mm\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*mm/i;
    let match = raw.match(mmSpacedPattern);
    
    if (!match) {
      // Standard pattern with explicit separators
      const separatorPattern = /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s*[x×\*·]+\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s*[x×\*·]+\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?/i;
      match = raw.match(separatorPattern);
    }
    
    if (!match) {
      // Enhanced patterns for space-separated: "135mm 102mm 47mm" or "135 102 47"
      const spacePattern = /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s+(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s+(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?/i;
      match = raw.match(spacePattern);
    }
    
    if (!match) return raw;
    
    const [, l, w, h] = match;
    const length = parseFloat(l.replace(',', '.'));
    const width = parseFloat(w.replace(',', '.'));
    const height = parseFloat(h.replace(',', '.'));
    
    return length + ' × ' + width + ' × ' + height + ' mm';
  }

  /**
   * Normalize weight to grams
   * Enhanced for dual units and varying spacing
   */
  normalizeWeight(raw) {
    // Support dual units: "500 g / 1.1 lb" - extract primary (g)
    const dualUnitPattern = /(\d+(?:[.,]\d+)?)\s*(g|grams?)\s*\/\s*\d+(?:[.,]\d+)?\s*(?:lb|pound|oz|ounce)/i;
    let match = raw.match(dualUnitPattern);
    
    if (!match) {
      // Standard weight pattern with flexible spacing
      const standardPattern = /(\d+(?:[.,]\d+)?)\s*(g|kg|grams?|kilograms?|pound|lb|oz|ounce)/i;
      match = raw.match(standardPattern);
    }
    
    if (!match) return raw;
    
    const [, value, unit] = match;
    let weight = parseFloat(value.replace(',', '.'));
    
    // Convert to grams
    if (unit.toLowerCase().startsWith('kg')) {
      weight *= 1000;
    } else if (unit.toLowerCase().startsWith('lb') || unit.toLowerCase().startsWith('pound')) {
      weight *= 453.592; // Convert pounds to grams
    } else if (unit.toLowerCase().startsWith('oz') || unit.toLowerCase().startsWith('ounce')) {
      weight *= 28.3495; // Convert ounces to grams
    }
    
    return weight + ' g';
  }

  /**
   * Normalize temperature range
   * Enhanced for multiple separators and approximation symbols
   */
  normalizeTemperature(raw) {
    // Support multiple range separators: -, –, ~, to, /
    // Handle approximation symbols: ≈, ~, (typ), typical
    const cleanedRaw = raw.replace(/[≈~]/g, '').replace(/\(typ\)|typical/gi, '');
    
    // Range pattern with flexible separators
    const rangePattern = /([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|°\s*C|C)?\s*(?:to|–|-|~|\/)\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|°\s*C|C)?/i;
    let match = cleanedRaw.match(rangePattern);
    
    if (!match) {
      // Single temperature value
      const singlePattern = /([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|°\s*C|C)/i;
      match = cleanedRaw.match(singlePattern);
      if (match) {
        const temp = parseFloat(match[1].replace(',', '.'));
        return temp + '°C';
      }
      return raw;
    }
    
    const [, min, max] = match;
    const minTemp = parseFloat(min.replace(',', '.'));
    const maxTemp = parseFloat(max.replace(',', '.'));
    
    return minTemp + '°C to ' + maxTemp + '°C';
  }

  /**
   * Normalize voltage range
   * Enhanced for positive prefixes and flexible separators
   */
  normalizeVoltage(raw) {
    // Clean positive prefixes: "+3 to 15" -> "3 to 15"
    const cleanedRaw = raw.replace(/\+(\d)/g, '$1');
    
    // Support multiple range separators and unit spacing
    const rangePattern = /(\d+(?:[.,]\d+)?)\s*(?:[–\-~]|to|\/)\s*(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V|VCC|volts?)/i;
    let match = cleanedRaw.match(rangePattern);
    
    if (!match) {
      // Single voltage value
      const singlePattern = /(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V|VCC|volts?)/i;
      match = cleanedRaw.match(singlePattern);
      if (match) {
        const [, value, unit] = match;
        const voltage = parseFloat(value.replace(',', '.'));
        return voltage + ' ' + unit.toUpperCase();
      }
      return raw;
    }
    
    const [, min, max, unit] = match;
    const minVolt = parseFloat(min.replace(',', '.'));
    const maxVolt = parseFloat(max.replace(',', '.'));
    
    return minVolt + '–' + maxVolt + ' ' + unit.toUpperCase();
  }

  /**
   * Normalize power consumption
   * Enhanced for approximation symbols and unit spacing
   */
  normalizePower(raw) {
    // Handle approximation symbols and typography variations
    const cleanedRaw = raw.replace(/[≈~]/g, '').replace(/\(typ\)|typical/gi, '');
    
    // Support unit spacing variations: "2W(typ)", "65 m A", "2.5 W"
    const powerPattern = /(\d+(?:[.,]\d+)?)\s*(?:mA|mW|W|watts?|milliwatts?|milliamps?)/i;
    const match = cleanedRaw.match(powerPattern);
    
    if (!match) return raw;
    
    const [, value] = match;
    const power = parseFloat(value.replace(',', '.'));
    
    // Extract unit from original match
    const unitMatch = cleanedRaw.match(/\d+(?:[.,]\d+)?\s*(mA|mW|W|watts?|milliwatts?|milliamps?)/i);
    let unit = 'W';
    
    if (unitMatch) {
      const rawUnit = unitMatch[1].toLowerCase();
      if (rawUnit.startsWith('ma')) {
        unit = 'mA';
      } else if (rawUnit.startsWith('mw')) {
        unit = 'mW';
      } else {
        unit = 'W';
      }
    }
    
    return power + ' ' + unit;
  }

  /**
   * Normalize accuracy specification
   * Enhanced for spacing variations and range formats
   */
  normalizeAccuracy(raw) {
    // Support spacing variations and multiple formats
    const accuracyPattern = /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)\s*(?:\+\s*(\d+(?:[.,]\d+)?)\s*ppm)?/i;
    let match = raw.match(accuracyPattern);
    
    if (!match) {
      // Alternative format: "± 2.5 m"
      const altPattern = /[±]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)/i;
      match = raw.match(altPattern);
      if (match) {
        const [, value, unit] = match;
        let accuracy = parseFloat(value.replace(',', '.'));
        
        // Convert to cm
        if (unit.toLowerCase() === 'mm') accuracy /= 10;
        if (unit.toLowerCase() === 'm') accuracy *= 100;
        
        return '± ' + accuracy + ' cm';
      }
      return raw;
    }
    
    const [, value, unit, ppm] = match;
    let accuracy = parseFloat(value.replace(',', '.'));
    
    // Convert to cm
    if (unit.toLowerCase() === 'mm') accuracy /= 10;
    if (unit.toLowerCase() === 'm') accuracy *= 100;
    
    let result = accuracy + ' cm';
    if (ppm) {
      result += ' + ' + parseFloat(ppm.replace(',', '.')) + ' ppm';
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
   * Enhanced for approximation symbols and unit variations
   */
  normalizeTimeSync(raw) {
    // Clean approximation symbols
    const cleanedRaw = raw.replace(/[≈~]/g, '').replace(/\(typ\)|typical/gi, '');
    
    // Support ± prefix and unit spacing variations
    const timeSyncPattern = /(?:[±]\s*)?(\d+(?:[.,]\d+)?)\s*(ns|μs|nanoseconds?|microseconds?)/i;
    const match = cleanedRaw.match(timeSyncPattern);
    
    if (!match) return raw;
    
    const [, value, unit] = match;
    let accuracy = parseFloat(value.replace(',', '.'));
    
    // Convert to ns
    if (unit.toLowerCase().startsWith('μs') || unit.toLowerCase().startsWith('microsecond')) {
      accuracy *= 1000;
    }
    
    return accuracy + ' ns RMS';
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

  /**
   * Normalize product description - extract meaningful overview text
   */
  normalizeDescription(raw) {
    // Clean up the raw description
    let cleaned = raw.trim();
    
    // Remove common prefixes
    cleaned = cleaned.replace(/^(Description|Overview|Features?):\s*/i, '');
    
    // Remove bullet point markers
    cleaned = cleaned.replace(/^[•·\-\*]\s*/, '');
    
    // Limit length to reasonable size
    if (cleaned.length > 200) {
      // Find last complete sentence within 200 chars
      const truncated = cleaned.substring(0, 200);
      const lastSentence = truncated.lastIndexOf('.');
      if (lastSentence > 100) {
        cleaned = truncated.substring(0, lastSentence + 1);
      } else {
        cleaned = truncated + '...';
      }
    }
    
    return cleaned;
  }

  // === ADAPTIVE RECOVERY HELPER METHODS ===

  /**
   * Generate relaxed patterns for Tier 2 recovery
   */
  generateRelaxedPatterns(fieldName, fieldConfig) {
    const relaxedPatterns = [];
    
    switch (fieldName) {
      case 'dimensions':
        // More permissive dimension patterns - handle spec table format
        relaxedPatterns.push(/(\d+)\s*mm\s*x\s*(\d+)\s*mm\s*x\s*(\d+)\s*mm/gi);
        relaxedPatterns.push(/(\d+)\s*\w*\s*[x×*·\s]+\s*(\d+)\s*\w*\s*[x×*·\s]+\s*(\d+)/gi);
        relaxedPatterns.push(/(\d+)\s+(\d+)\s+(\d+)/gi); // Just three numbers
        // Handle parenthetical dimensions: "274 mm x 185 mm x 17 mm (10.8" x 7.3" x 0.67")"
        relaxedPatterns.push(/(\d+)\s*mm\s*x\s*(\d+)\s*mm\s*x\s*(\d+)\s*mm\s*\([^)]*\)/gi);
        break;
        
      case 'weight':
        // Look for weight in spec format "980 g (2.2 lbs)"
        relaxedPatterns.push(/(\d+)\s*g\s*\([^)]*\)/gi);
        relaxedPatterns.push(/(\d+(?:[.,]\d+)?)\s*(?:g|kg|grams?|kilograms?|lb|pound|oz)/gi);
        relaxedPatterns.push(/(\d+(?:[.,]\d+)?)\s*g/gi);
        break;
        
      case 'operating_temperature':
        // Temperature ranges in environmental specs: "-20°C to 60°C (-4°F to 140°F)"
        relaxedPatterns.push(/([-+]?\d+)\s*°C\s*to\s*([-+]?\d+)\s*°C\s*\([^)]*\)/gi);
        relaxedPatterns.push(/([-+]?\d+)\s*°C\s*to\s*([-+]?\d+)\s*°C/gi);
        relaxedPatterns.push(/([-+]?\d+)\s*(?:°C|C|degrees?)/gi);
        relaxedPatterns.push(/([-+]?\d+)\s*(?:to|[-–~])\s*([-+]?\d+)/gi);
        break;
        
      case 'storage_temperature':
        // Storage temperature patterns
        relaxedPatterns.push(/([-+]?\d+)\s*°C\s*to\s*([-+]?\d+)\s*°C\s*\([^)]*\)/gi);
        relaxedPatterns.push(/([-+]?\d+)\s*°C\s*to\s*([-+]?\d+)\s*°C/gi);
        break;
        
      case 'input_voltage':
        // Voltage patterns
        relaxedPatterns.push(/(\d+(?:[.,]\d+)?)\s*(?:VDC|VAC|V|volts?)/gi);
        relaxedPatterns.push(/(\d+(?:[.,]\d+)?)\s*[-–~]\s*(\d+(?:[.,]\d+)?)/gi);
        break;
        
      case 'power_consumption':
        // Power patterns - also look in battery specs
        relaxedPatterns.push(/(\d+(?:[.,]\d+)?)\s*(?:W|watts?|mA|mW)/gi);
        relaxedPatterns.push(/(\d+)\s*mAh/gi); // Battery capacity
        break;
        
      case 'product_description':
        // Description extraction patterns
        // Look for overview paragraphs in first 1/3 of document
        relaxedPatterns.push(/(?:overview|description|features?):\s*([^.]{50,}\.)/gi);
        // Feature bullet points
        relaxedPatterns.push(/[•·\-\*]\s*([^•·\-\*\n]{30,})/g);
        // Marketing sentences
        relaxedPatterns.push(/[A-Z][^.!?]{40,}[.!?]/g);
        break;
        
      default:
        // Generic numeric patterns for other fields
        relaxedPatterns.push(/(\d+(?:[.,]\d+)?)/gi);
    }
    
    return relaxedPatterns;
  }

  /**
   * Calculate confidence for relaxed pattern matches
   */
  calculateRelaxedConfidence(match, text, fieldConfig) {
    let confidence = 30; // Base confidence for relaxed patterns
    
    // Bonus if found near field aliases
    const context = this.extractContext(text, match.index, 80);
    const contextLower = context.toLowerCase();
    
    for (const alias of fieldConfig.aliases) {
      if (contextLower.includes(alias.toLowerCase())) {
        confidence += 20; // Increased bonus for alias proximity
        break;
      }
    }
    
    // Bonus for specification table context indicators
    if (contextLower.includes('specification') || contextLower.includes('dimensions') ||
        contextLower.includes('weight') || contextLower.includes('operating') ||
        contextLower.includes('storage') || contextLower.includes('environment')) {
      confidence += 15;
    }
    
    // Bonus for reasonable match length
    if (match[0].length >= 3) confidence += 5;
    
    // Bonus for proper units in context
    if (fieldConfig.unit === 'mm' && contextLower.includes('mm')) confidence += 10;
    if (fieldConfig.unit === 'g' && contextLower.includes('g')) confidence += 10;
    if (fieldConfig.unit === '°C' && contextLower.includes('°c')) confidence += 10;
    
    // Penalty for very short or very long matches
    if (match[0].length < 2) confidence -= 15;
    if (match[0].length > 50) confidence -= 10;
    
    return Math.min(75, Math.max(10, confidence)); // Cap between 10-75 for relaxed patterns
  }

  /**
   * Extract values based on proximity to field aliases
   */
  extractProximityValues(searchText, fieldConfig) {
    const values = [];
    
    // Use relaxed patterns in the proximity text
    const relaxedPatterns = this.generateRelaxedPatterns(fieldConfig.unit, fieldConfig);
    
    for (const pattern of relaxedPatterns) {
      let match;
      while ((match = pattern.exec(searchText)) !== null) {
        values.push(match[0]);
        if (!pattern.global) break;
      }
    }
    
    return values;
  }

  /**
   * Identify document sections for section-based extraction
   */
  identifyDocumentSections(pdfText) {
    const sections = {};
    const lines = pdfText.split('\n');
    
    let currentSection = 'general';
    let sectionContent = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      
      // Identify specification tables (key indicators)
      if (line.match(/^\s*(Dimensions|Weight|Operating|Storage|Input|Power|Processor|RAM|Display|Battery|Communication|Environment)\s*$/i) ||
          line.match(/^\s*(Dimensions|Weight|Operating|Storage|Input|Power)\s+/i)) {
        if (sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'performance';
        sectionContent = [line];
        continue;
      }
      
      // Environmental/operating conditions section
      if (lowerLine.includes('environment') || lowerLine.includes('operating') || 
          lowerLine.includes('storage') || lowerLine.includes('temperature')) {
        if (sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'performance';
        sectionContent = [line];
        continue;
      }
      
      // Technical specifications section
      if (lowerLine.includes('specification') || lowerLine.includes('technical') || 
          lowerLine.includes('hardware') || lowerLine.includes('positioning') ||
          line.match(/^\s*[A-Z\s]{3,}\s*$/)) { // All caps headers
        if (sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'technical';
        sectionContent = [line];
        continue;
      }
      
      // Features section
      if (lowerLine.includes('feature') || lowerLine.includes('capability') ||
          lowerLine.includes('performance') || lowerLine.includes('computing')) {
        if (sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'features';
        sectionContent = [line];
        continue;
      }
      
      // Marketing/overview section (usually at the beginning)
      if (i < lines.length / 4 && (lowerLine.includes('overview') || lowerLine.includes('description') ||
          line.length > 80 && !line.match(/\d+\s*(mm|g|Hz|VDC|°C)/))) {
        if (sectionContent.length > 0 && currentSection !== 'marketing') {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'marketing';
        sectionContent = [line];
        continue;
      }
      
      sectionContent.push(line);
    }
    
    // Add final section
    if (sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n');
    }
    
    return sections;
  }

  /**
   * Extract values from a specific document section
   */
  extractSectionValues(sectionText, fieldConfig, sectionType) {
    const values = [];
    
    // Use appropriate patterns based on section type
    let patterns = fieldConfig.valuePatterns;
    
    if (sectionType === 'marketing') {
      // Use broader patterns for marketing sections
      patterns = this.generateBroadPatterns(fieldConfig.unit, fieldConfig);
    }
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(sectionText)) !== null) {
        values.push(match[0]);
        if (!pattern.global) break;
      }
    }
    
    return values;
  }

  /**
   * Generate broad patterns for document-wide search
   */
  generateBroadPatterns(fieldName, fieldConfig) {
    const broadPatterns = [];
    
    switch (fieldName) {
      case 'dimensions':
        // Very broad dimension patterns
        broadPatterns.push(/(\d+)\s*[x×*·\s]\s*(\d+)\s*[x×*·\s]\s*(\d+)/gi);
        break;
        
      case 'weight':
        // Any number with possible weight context
        broadPatterns.push(/(\d+(?:[.,]\d+)?)\s*[gk]/gi);
        break;
        
      case 'operating_temperature':
        // Any temperature-like pattern
        broadPatterns.push(/([-+]?\d+)[\s°]*C/gi);
        break;
        
      case 'input_voltage':
        // Any voltage-like pattern
        broadPatterns.push(/(\d+(?:[.,]\d+)?)\s*V/gi);
        break;
        
      case 'power_consumption':
        // Any power-like pattern
        broadPatterns.push(/(\d+(?:[.,]\d+)?)\s*[WmA]/gi);
        break;
        
      case 'product_description':
        // Very broad description patterns
        // Any sentence longer than 30 characters
        broadPatterns.push(/[A-Z][^.!?]{30,}[.!?]/g);
        // Any line with descriptive words
        broadPatterns.push(/.*(?:features?|capabilities?|designed?|provides?|offers?|delivers?).*[.!?]/gi);
        break;
        
      default:
        // Very generic numeric patterns
        broadPatterns.push(/\b(\d+(?:[.,]\d+)?)\b/gi);
    }
    
    return broadPatterns;
  }

  /**
   * Extract product description from document using specialized logic
   */
  extractDescriptionFromDocument(pdfText, fieldConfig) {
    try {
      const lines = pdfText.split('\n');
      const firstThird = lines.slice(0, Math.floor(lines.length / 3));
      const candidates = [];
      
      // Look for overview paragraphs in first 1/3 of document
      for (const line of firstThird) {
        if (line.length > 100 && line.includes('.') && 
            !line.match(/\d+\s*(mm|g|Hz|VDC|°C)/) && // Avoid technical specs
            !line.match(/^\s*[A-Z]+\s*$/) && // Avoid headers
            line.match(/[a-z].*[a-z]/)) { // Requires lowercase letters (descriptive text)
          
          candidates.push({
            raw: line.trim(),
            normalized: line.trim(),
            confidence: 50,
            context: line.substring(0, 100),
            method: 'description_extraction',
            matchIndex: 0
          });
        }
      }
      
      // Fallback: Extract bullet points from features section
      if (candidates.length === 0) {
        const featureBullets = this.extractFeatureBullets(pdfText);
        if (featureBullets) {
          candidates.push({
            raw: featureBullets,
            normalized: featureBullets,
            confidence: 40,
            context: featureBullets.substring(0, 100),
            method: 'feature_bullets',
            matchIndex: 0
          });
        }
      }
      
      const bestCandidate = this.selectBestCandidate(candidates, fieldConfig);
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'description_extraction', rawValue: null };
      }
      
      const normalized = this.normalizeValue(bestCandidate, fieldConfig);
      return {
        value: normalized.value,
        confidence: Math.max(25, normalized.confidence - 10),
        context: bestCandidate.context,
        method: 'description_extraction',
        rawValue: bestCandidate.raw
      };
    } catch (error) {
      return { value: null, confidence: 0, context: '', method: 'description_extraction', rawValue: null, error: error.message };
    }
  }

  /**
   * Extract feature bullets as fallback for description
   */
  extractFeatureBullets(pdfText) {
    const lines = pdfText.split('\n');
    const bullets = [];
    
    for (const line of lines) {
      // Look for bullet points
      if (line.match(/^\s*[•·\-\*]\s*[A-Z]/) && line.length > 20) {
        bullets.push(line.trim().replace(/^[•·\-\*]\s*/, ''));
        if (bullets.length >= 3) break; // Limit to first 3 bullets
      }
    }
    
    if (bullets.length > 0) {
      return bullets.join('. ') + '.';
    }
    
    return null;
  }
}

// Export for use in other modules - lazy instantiation
var EXTRACTORS = null;

function getExtractors() {
  if (!EXTRACTORS) {
    EXTRACTORS = new FieldExtractors();
  }
  return EXTRACTORS;
}
