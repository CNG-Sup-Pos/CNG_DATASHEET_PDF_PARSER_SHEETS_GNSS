/**
 * GNSS PDF Parser - Field Extractors Module (MODULARIZED)
 * Core field extraction with multi-tier adaptive recovery
 * Lines: ~280 (within 300-line limit)
 */

/**
 * Get field extractors instance (module pattern)
 */
function getFieldExtractors() {
  return new FieldExtractors();
}

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
      const relaxedPatterns = getPatternGenerators().generateRelaxedPatterns(fieldName, fieldConfig);
      
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
      
      const normalized = getValueNormalizers().normalizeValue(bestCandidate, fieldConfig);
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
            const lineGap = proximitySettings.lineGap || 2;
            const searchLines = [];
            
            // Add current line and nearby lines
            for (let j = Math.max(0, i - lineGap); j <= Math.min(lines.length - 1, i + lineGap); j++) {
              if (j !== i) {
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
      
      const normalized = getValueNormalizers().normalizeValue(bestCandidate, fieldConfig);
      return {
        value: normalized.value,
        confidence: Math.max(15, normalized.confidence - 15),
        context: bestCandidate.context,
        method: 'proximity_recovery',
        rawValue: bestCandidate.raw
      };
    } catch (error) {
      return { value: null, confidence: 0, context: '', method: 'proximity_recovery', rawValue: null, error: error.message };
    }
  }

  /**
   * Helper methods delegated to other modules
   */
  findValueCandidates(pdfText, fieldConfig) {
    return getPatternGenerators().findValueCandidates(pdfText, fieldConfig);
  }

  selectBestCandidate(candidates, fieldConfig) {
    return getExtractionHelpers().selectBestCandidate(candidates, fieldConfig);
  }

  normalizeValue(candidate, fieldConfig) {
    return getValueNormalizers().normalizeValue(candidate, fieldConfig);
  }

  extractContext(text, index, length) {
    return getExtractionHelpers().extractContext(text, index, length);
  }

  calculateRelaxedConfidence(match, pdfText, fieldConfig) {
    return getExtractionHelpers().calculateRelaxedConfidence(match, pdfText, fieldConfig);
  }

  extractProximityValues(text, fieldConfig) {
    return getExtractionHelpers().extractProximityValues(text, fieldConfig);
  }

  extractDescriptionFromDocument(pdfText, fieldConfig) {
    return getDocumentAnalyzers().extractDescriptionFromDocument(pdfText, fieldConfig);
  }

  sectionBasedExtraction(fieldName, pdfText, fieldConfig) {
    return getDocumentAnalyzers().sectionBasedExtraction(fieldName, pdfText, fieldConfig);
  }

  documentWideSearch(fieldName, pdfText, fieldConfig) {
    return getDocumentAnalyzers().documentWideSearch(fieldName, pdfText, fieldConfig);
  }
}
