/**
 * GNSS PDF Parser - PDF Processing Module (MODULARIZED)
 * PDF text extraction with multiple fallback methods
 * Lines: ~235 (within 300-line limit)
 */

/**
 * Get PDF processor instance (module pattern)
 */
function getPDFProcessor() {
  return {
    extractTextFromPDF: extractTextFromPDF,
    extractTextViaDriveOCR: extractTextViaDriveOCR,
    extractTextFromBlob: extractTextFromBlob,
    extractTextViaCopyOCR: extractTextViaCopyOCR
  };
}

/**
 * Extract text from PDF using multiple methods
 * Primary interface for PDF text extraction
 */
function extractTextFromPDF(file) {
  console.log(`Starting text extraction from: ${file.getName()}`);
  
  try {
    // Method 1: Simple Drive OCR (most reliable)
    console.log('Attempting Method 1: Drive OCR conversion...');
    const text1 = extractTextViaDriveOCR(file);
    if (text1 && text1.length > 100) {
      console.log(`Method 1 success: ${text1.length} characters extracted`);
      return text1;
    }
  } catch (error) {
    console.warn('Method 1 failed:', error.message);
  }

  try {
    // Method 2: Direct blob conversion 
    console.log('Attempting Method 2: Direct blob processing...');
    const text2 = extractTextFromBlob(file);
    if (text2 && text2.length > 100) {
      console.log(`Method 2 success: ${text2.length} characters extracted`);
      return text2;
    }
  } catch (error) {
    console.warn('Method 2 failed:', error.message);
  }

  try {
    // Method 3: Copy and OCR method
    console.log('Attempting Method 3: Copy-based OCR...');
    const text3 = extractTextViaCopyOCR(file);
    if (text3 && text3.length > 100) {
      console.log(`Method 3 success: ${text3.length} characters extracted`);
      return text3;
    }
  } catch (error) {
    console.warn('Method 3 failed:', error.message);
  }

  // If all methods fail, throw detailed error
  const errorMsg = `All PDF extraction methods failed for file: ${file.getName()}. File size: ${file.getSize()} bytes. MIME type: ${file.getBlob().getContentType()}`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

/**
 * Method 1: Simple Drive OCR conversion
 * Most reliable method for most PDFs
 */
function extractTextViaDriveOCR(file) {
  // Get source folder for temporary files
  const tempFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  
  // Create OCR version using Drive API
  const resource = {
    name: `temp_ocr_${Date.now()}`,
    parents: [SOURCE_FOLDER_ID]
  };
  
  const ocrFile = Drive.Files.copy(resource, file.getId(), {
    ocr: true,
    ocrLanguage: 'en'
  });
  
  try {
    // Get the converted document
    const doc = DocumentApp.openById(ocrFile.id);
    const text = doc.getBody().getText();
    
    // Cleanup temporary file
    Drive.Files.remove(ocrFile.id);
    
    return text;
  } catch (error) {
    // Cleanup on error
    try {
      Drive.Files.remove(ocrFile.id);
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError);
    }
    throw error;
  }
}

/**
 * Method 2: Direct blob text extraction 
 * Works for text-based PDFs without OCR
 */
function extractTextFromBlob(file) {
  const blob = file.getBlob();
  
  // Try to read as text directly (works for some PDFs)
  try {
    const text = blob.getDataAsString();
    
    // Basic validation - look for common GNSS datasheet terms
    if (text.includes('Dimensions') || 
        text.includes('Weight') || 
        text.includes('Accuracy') ||
        text.includes('GNSS') ||
        text.includes('GPS') ||
        text.includes('Receiver')) {
      return text;
    }
  } catch (error) {
    console.warn('Direct blob reading failed:', error);
  }
  
  // Try different character encodings
  try {
    const text = blob.getDataAsString('UTF-8');
    if (text && text.length > 50) {
      return text;
    }
  } catch (error) {
    console.warn('UTF-8 blob reading failed:', error);
  }
  
  try {
    const text = blob.getDataAsString('ISO-8859-1');
    if (text && text.length > 50) {
      return text;
    }
  } catch (error) {
    console.warn('ISO-8859-1 blob reading failed:', error);
  }
  
  throw new Error('Blob extraction failed - no readable text found');
}

/**
 * Method 3: Alternative copy-based OCR
 * Backup method using Google Docs import with OCR
 */
function extractTextViaCopyOCR(file) {
  // Create a temporary Google Doc with OCR
  const blob = file.getBlob();
  
  const tempDoc = DriveApp.createFile(
    'temp_pdf_' + Date.now(), 
    blob, 
    MimeType.PDF
  );
  
  try {
    // Import to Google Docs with OCR
    const resource = {
      name: 'temp_ocr_doc_' + Date.now(),
      parents: [SOURCE_FOLDER_ID],
      mimeType: MimeType.GOOGLE_DOCS
    };
    
    const importedFile = Drive.Files.create(resource, tempDoc.getBlob(), {
      ocr: true,
      ocrLanguage: 'en'
    });
    
    const doc = DocumentApp.openById(importedFile.id);
    const text = doc.getBody().getText();
    
    // Cleanup temporary files
    DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
    DriveApp.getFileById(importedFile.id).setTrashed(true);
    
    return text;
    
  } catch (error) {
    // Cleanup on error
    try {
      DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError);
    }
    throw error;
  }
}

/**
 * Enhanced PDF validation and preprocessing
 */
function validatePDFFile(file) {
  try {
    // Check file size (too small = likely empty, too large = might timeout)
    const fileSize = file.getSize();
    if (fileSize < 1000) {
      throw new Error('PDF file is too small (less than 1KB)');
    }
    if (fileSize > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('PDF file is too large (over 50MB)');
    }
    
    // Check MIME type
    const mimeType = file.getBlob().getContentType();
    if (mimeType !== MimeType.PDF) {
      console.warn(`File MIME type is ${mimeType}, expected ${MimeType.PDF}`);
    }
    
    // Check file extension
    const fileName = file.getName().toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      console.warn(`File name does not end with .pdf: ${fileName}`);
    }
    
    return {
      valid: true,
      size: fileSize,
      mimeType: mimeType,
      fileName: file.getName()
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Clean and preprocess extracted text
 */
function preprocessExtractedText(rawText) {
  if (!rawText) return '';
  
  let text = rawText;
  
  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ');
  
  // Remove common OCR artifacts
  text = text.replace(/[|]{2,}/g, ' '); // Multiple pipe characters
  text = text.replace(/_{3,}/g, ' ');   // Multiple underscores
  text = text.replace(/\.{3,}/g, '...');// Multiple dots
  
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  
  // Remove excessive line breaks
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  text = text.trim();
  
  return text;
}

/**
 * Extract metadata from PDF file
 */
function extractPDFMetadata(file) {
  try {
    return {
      name: file.getName(),
      size: file.getSize(),
      created: file.getDateCreated(),
      modified: file.getLastUpdated(),
      mimeType: file.getBlob().getContentType(),
      owner: file.getOwner().getEmail(),
      id: file.getId()
    };
  } catch (error) {
    console.warn('Could not extract full metadata:', error);
    return {
      name: file.getName(),
      size: file.getSize(),
      id: file.getId()
    };
  }
}
