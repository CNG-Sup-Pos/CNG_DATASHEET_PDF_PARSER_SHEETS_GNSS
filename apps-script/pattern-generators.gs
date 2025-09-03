/**
 * GNSS PDF Parser - Pattern Generators Module (MODULARIZED)
 * Regex pattern generation and matching utilities
 * Lines: ~248 (within 300-line limit)
 */

/**
 * Get pattern generators instance (module pattern)
 */
function getPatternGenerators() {
  return new PatternGenerators();
}

class PatternGenerators {
  constructor() {
    this.config = null;
  }

  getConfig() {
    if (!this.config) {
      this.config = CONFIG;
    }
    return this.config;
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
   * Generate relaxed patterns based on field type
   */
  generateRelaxedPatterns(fieldName, fieldConfig) {
    const patterns = [];
    const fieldType = fieldConfig.unit;
    
    switch (fieldType) {
      case 'mm':
        patterns.push(/\d+\.?\d*\s*[×x]\s*\d+\.?\d*\s*[×x]?\s*\d*\.?\d*\s*mm/gi);
        patterns.push(/\d+\.?\d*\s*[×x]\s*\d+\.?\d*/gi);
        break;
      case 'g':
        patterns.push(/\d+\.?\d*\s*g\b/gi);
        patterns.push(/\d+\.?\d*\s*gram/gi);
        break;
      case '°C':
        patterns.push(/-?\d+\.?\d*\s*°?C/gi);
        patterns.push(/-?\d+\.?\d*\s*celsius/gi);
        break;
      case 'VDC':
        patterns.push(/\d+\.?\d*\s*[-–—]\s*\d+\.?\d*\s*V/gi);
        patterns.push(/\d+\.?\d*\s*V\s*DC/gi);
        break;
      case 'W':
        patterns.push(/\d+\.?\d*\s*W\b/gi);
        patterns.push(/\d+\.?\d*\s*watt/gi);
        break;
      case 'cm':
        patterns.push(/\d+\.?\d*\s*cm/gi);
        patterns.push(/\d+\.?\d*\s*±\s*\d+\.?\d*/gi);
        break;
      case 'ms':
        patterns.push(/<?\d+\.?\d*\s*ms/gi);
        patterns.push(/\d+\.?\d*\s*millisecond/gi);
        break;
      case 'Hz':
        patterns.push(/\d+\.?\d*\s*Hz/gi);
        patterns.push(/\d+\.?\d*\s*hertz/gi);
        break;
      case 'ns':
        patterns.push(/\d+\.?\d*\s*ns/gi);
        patterns.push(/\d+\.?\d*\s*nanosecond/gi);
        break;
      case 'channels':
        patterns.push(/\d+\s*channel/gi);
        patterns.push(/\d+\s*tracking/gi);
        break;
      case 'IP code':
        patterns.push(/IP\s*\d+/gi);
        patterns.push(/IP\d+/gi);
        break;
      default:
        patterns.push(/[\w\s\-\.\,\(\)]+/gi);
    }
    
    return patterns;
  }

  /**
   * Generate broad patterns for document-wide search
   */
  generateBroadPatterns(fieldName, fieldConfig) {
    const patterns = [];
    const fieldType = fieldConfig.unit;
    
    switch (fieldType) {
      case 'mm':
        patterns.push(/\d+[×x\s]*\d+[×x\s]*\d*/gi);
        break;
      case 'g':
        patterns.push(/\d+\.?\d*/gi);
        break;
      case '°C':
        patterns.push(/-?\d+\.?\d*/gi);
        break;
      case 'VDC':
        patterns.push(/\d+[-–—]?\d*/gi);
        break;
      case 'W':
        patterns.push(/\d+\.?\d*/gi);
        break;
      case 'cm':
        patterns.push(/\d+\.?\d*[±\s]*\d*/gi);
        break;
      case 'ms':
        patterns.push(/<?\d+\.?\d*/gi);
        break;
      case 'Hz':
        patterns.push(/\d+\.?\d*/gi);
        break;
      case 'ns':
        patterns.push(/\d+\.?\d*/gi);
        break;
      case 'channels':
        patterns.push(/\d+/gi);
        break;
      case 'IP code':
        patterns.push(/\d+/gi);
        break;
      default:
        patterns.push(/\w+/gi);
    }
    
    return patterns;
  }

  /**
   * Get field-specific patterns from configuration
   */
  getFieldPatterns(fieldName) {
    const fieldConfig = this.getConfig().getFieldConfig(fieldName);
    return fieldConfig ? fieldConfig.valuePatterns || [] : [];
  }
}
