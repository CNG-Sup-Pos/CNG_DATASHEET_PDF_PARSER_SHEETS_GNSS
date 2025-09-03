/**
 * GNSS PDF Parser - Extraction Helpers Module (MODULARIZED)
 * Utility functions for extraction and candidate selection
 * Lines: ~248 (within 300-line limit)
 */

/**
 * Get extraction helpers instance (module pattern)
 */
function getExtractionHelpers() {
  return new ExtractionHelpers();
}

class ExtractionHelpers {
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
   * Validate candidate quality before processing
   */
  validateCandidate(candidate, fieldConfig) {
    if (!candidate || !candidate.raw) return false;
    
    // Basic length checks
    if (candidate.raw.length < 1 || candidate.raw.length > 100) return false;
    
    // Field-specific validation
    const fieldType = fieldConfig.unit;
    const value = candidate.raw.toLowerCase();
    
    switch (fieldType) {
      case 'mm':
        // Must contain numbers for dimensions
        return /\d/.test(value);
        
      case 'g':
        // Must contain numbers for weight
        return /\d/.test(value);
        
      case '°C':
        // Must contain numbers for temperature
        return /[-+]?\d/.test(value);
        
      case 'VDC':
        // Must contain numbers for voltage
        return /\d/.test(value);
        
      case 'W':
        // Must contain numbers for power
        return /\d/.test(value);
        
      case 'cm':
        // Must contain numbers for accuracy
        return /\d/.test(value);
        
      case 'ms':
        // Must contain numbers for latency
        return /\d/.test(value);
        
      case 'Hz':
        // Must contain numbers for frequency
        return /\d/.test(value);
        
      case 'ns':
        // Must contain numbers for time sync
        return /\d/.test(value);
        
      case 'channels':
        // Must contain numbers for channels
        return /\d/.test(value);
        
      case 'IP code':
        // Must start with IP and contain numbers
        return /ip\d/.test(value);
        
      case 'text':
        // Text fields should have reasonable length and content
        return value.length >= 5 && /[a-z]/.test(value);
        
      default:
        return true;
    }
  }

  /**
   * Enhance candidate with additional metadata
   */
  enhanceCandidate(candidate, text, fieldConfig) {
    if (!candidate) return candidate;
    
    // Add position information
    candidate.position = this.calculateTextPosition(text, candidate.matchIndex || 0);
    
    // Add context quality score
    candidate.contextQuality = this.assessContextQuality(candidate.context, fieldConfig);
    
    // Add validation score
    candidate.validationScore = this.validateCandidate(candidate, fieldConfig) ? 10 : -10;
    
    // Adjust confidence based on enhancements
    const originalConfidence = candidate.confidence || 0;
    const adjustedConfidence = originalConfidence + candidate.contextQuality + candidate.validationScore;
    candidate.confidence = Math.max(0, Math.min(100, adjustedConfidence));
    
    return candidate;
  }

  /**
   * Calculate relative position in document (0.0 to 1.0)
   */
  calculateTextPosition(text, index) {
    return index / text.length;
  }

  /**
   * Assess the quality of extraction context
   */
  assessContextQuality(context, fieldConfig) {
    if (!context) return 0;
    
    let score = 0;
    const contextLower = context.toLowerCase();
    
    // Bonus for field aliases in context
    for (const alias of fieldConfig.aliases) {
      if (contextLower.includes(alias.toLowerCase())) {
        score += 5;
        break; // Only count once
      }
    }
    
    // Bonus for specification keywords
    const specKeywords = ['specification', 'dimensions', 'weight', 'operating', 'storage', 'power', 'voltage'];
    for (const keyword of specKeywords) {
      if (contextLower.includes(keyword)) {
        score += 3;
        break;
      }
    }
    
    // Bonus for table-like structure
    if (contextLower.includes(':') || contextLower.includes('|') || /\s{3,}/.test(context)) {
      score += 2;
    }
    
    // Penalty for noisy context
    if (contextLower.includes('copyright') || contextLower.includes('page') || contextLower.includes('figure')) {
      score -= 5;
    }
    
    return Math.max(-10, Math.min(10, score));
  }

  /**
   * Merge similar candidates to reduce duplicates
   */
  mergeSimilarCandidates(candidates, threshold = 0.8) {
    if (candidates.length <= 1) return candidates;
    
    const merged = [];
    const used = new Set();
    
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue;
      
      const candidate = candidates[i];
      const similar = [candidate];
      
      for (let j = i + 1; j < candidates.length; j++) {
        if (used.has(j)) continue;
        
        const similarity = this.calculateSimilarity(candidate.raw, candidates[j].raw);
        if (similarity >= threshold) {
          similar.push(candidates[j]);
          used.add(j);
        }
      }
      
      // Merge similar candidates
      if (similar.length > 1) {
        const bestCandidate = similar.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        
        // Boost confidence for having multiple similar matches
        bestCandidate.confidence += Math.min(10, similar.length * 2);
        merged.push(bestCandidate);
      } else {
        merged.push(candidate);
      }
      
      used.add(i);
    }
    
    return merged;
  }
}

function getExtractionHelpers() {
  if (typeof window === 'undefined' || !window.extractionHelpersInstance) {
    if (typeof window !== 'undefined') {
      window.extractionHelpersInstance = new ExtractionHelpers();
    } else {
      return new ExtractionHelpers();
    }
  }
  return window.extractionHelpersInstance || new ExtractionHelpers();
}
