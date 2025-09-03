/**
 * GNSS PDF Parser - Document Analyzers Module (MODULARIZED)
 * Document structure analysis and section-based extraction
 * Lines: ~248 (within 300-line limit)
 */

/**
 * Get document analyzers instance (module pattern)
 */
function getDocumentAnalyzers() {
  return new DocumentAnalyzers();
}

class DocumentAnalyzers {
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
      
      const bestCandidate = getExtractionHelpers().selectBestCandidate(candidates, fieldConfig);
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'section_based', rawValue: null };
      }
      
      const normalized = getValueNormalizers().normalizeValue(bestCandidate, fieldConfig);
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
            context: getExtractionHelpers().extractContext(pdfText, match.index, 30),
            method: 'document_wide',
            matchIndex: match.index
          });
          
          if (!pattern.global) break;
        }
      }
      
      const bestCandidate = getExtractionHelpers().selectBestCandidate(candidates, fieldConfig);
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'document_wide', rawValue: null };
      }
      
      const normalized = getValueNormalizers().normalizeValue(bestCandidate, fieldConfig);
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
        broadPatterns.push(/(\d+)\s*[x×*·\s]\s*(\d+)\s*[x×*·\s]\s*(\d+)/gi);
        break;
      case 'weight':
        broadPatterns.push(/(\d+(?:[.,]\d+)?)\s*[gk]/gi);
        break;
      case 'operating_temperature':
        broadPatterns.push(/([-+]?\d+)[\s°]*C/gi);
        break;
      case 'input_voltage':
        broadPatterns.push(/(\d+(?:[.,]\d+)?)\s*V/gi);
        break;
      case 'power_consumption':
        broadPatterns.push(/(\d+(?:[.,]\d+)?)\s*[WmA]/gi);
        break;
      case 'product_description':
        broadPatterns.push(/[A-Z][^.!?]{30,}[.!?]/g);
        broadPatterns.push(/.*(?:features?|capabilities?|designed?|provides?|offers?|delivers?).*[.!?]/gi);
        break;
      default:
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
      
      const bestCandidate = getExtractionHelpers().selectBestCandidate(candidates, fieldConfig);
      if (!bestCandidate) {
        return { value: null, confidence: 0, context: '', method: 'description_extraction', rawValue: null };
      }
      
      const normalized = getValueNormalizers().normalizeValue(bestCandidate, fieldConfig);
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
