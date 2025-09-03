/**
 * GNSS PDF Parser - Main Extractors Interface (MODULARIZED)
 * Entry point that delegates to specialized extraction modules
 * Lines: ~60 (within 300-line limit)
 */

/**
 * Export for use in other modules - lazy instantiation
 */
var EXTRACTORS = null;

function getExtractors() {
  if (!EXTRACTORS) {
    EXTRACTORS = getFieldExtractors();
  }
  return EXTRACTORS;
}

/**
 * Direct access functions for backward compatibility
 */
function extractAllFields(pdfText) {
  return getExtractors().extractAllFields(pdfText);
}

function extractField(fieldName, pdfText) {
  return getExtractors().extractField(fieldName, pdfText);
}

function extractFieldWithRecovery(fieldName, pdfText, fieldConfig) {
  return getExtractors().extractFieldWithRecovery(fieldName, pdfText, fieldConfig);
}

function standardExtraction(fieldName, pdfText, fieldConfig) {
  return getExtractors().standardExtraction(fieldName, pdfText, fieldConfig);
}

function relaxedPatternExtraction(fieldName, pdfText, fieldConfig) {
  return getExtractors().relaxedPatternExtraction(fieldName, pdfText, fieldConfig);
}

function proximityRecovery(fieldName, pdfText, fieldConfig) {
  return getExtractors().proximityRecovery(fieldName, pdfText, fieldConfig);
}

function sectionBasedExtraction(fieldName, pdfText, fieldConfig) {
  return getDocumentAnalyzers().sectionBasedExtraction(fieldName, pdfText, fieldConfig);
}

function documentWideSearch(fieldName, pdfText, fieldConfig) {
  return getDocumentAnalyzers().documentWideSearch(fieldName, pdfText, fieldConfig);
}

function findValueCandidates(text, fieldConfig) {
  return getPatternGenerators().findValueCandidates(text, fieldConfig);
}

function selectBestCandidate(candidates, fieldConfig) {
  return getExtractionHelpers().selectBestCandidate(candidates, fieldConfig);
}

function normalizeValue(candidate, fieldConfig) {
  return getValueNormalizers().normalizeValue(candidate, fieldConfig);
}

function extractContext(text, index, radius) {
  return getExtractionHelpers().extractContext(text, index, radius);
}

/**
 * Module initialization check
 */
function initializeExtractorModules() {
  try {
    console.log('Initializing extractor modules...');
    
    // Check all modules are available
    const fieldExtractors = getFieldExtractors();
    const patternGenerators = getPatternGenerators();
    const valueNormalizers = getValueNormalizers();
    const documentAnalyzers = getDocumentAnalyzers();
    const extractionHelpers = getExtractionHelpers();
    
    console.log('All extractor modules initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize extractor modules:', error);
    return false;
  }
}
