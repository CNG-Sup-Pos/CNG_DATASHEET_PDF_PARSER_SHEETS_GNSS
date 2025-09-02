# 🎯 GNSS Parser Comprehensive Implementation Plan
*Auto-deleting implementation plan - remove after completion*

## 📋 Executive Summary
This plan consolidates all major improvements identified in the chat history:
- **Adaptive Field Recovery**: Multi-tier fallback system for failed extractions
- **Pattern Flexibility**: Robust regex patterns for real-world PDF variations
- **Advanced Configuration**: Tabbed UI for proximity, section weights, and extraction methods
- **Descriptive Text Addition**: Product overview field extraction
- **Config System Fixes**: Proper error handling for Save Settings functionality

**Target**: Transform rigid parser into adaptive, user-configurable system with 90%+ extraction success rate.

---

## 🏗️ Implementation Checkpoints

### ✅ CHECKPOINT 1: Fix Save Settings & Add Advanced Config UI
**Files to modify:**
- `apps-script/main.gs` - Fix save error handling + add advanced dialog
- `apps-script/config.gs` - Extend SettingsManager for advanced options

**Save Settings Fix:**
```javascript
// Replace existing saveSettings function with error handling
function saveSettingsWithValidation(settings) {
  try {
    CONFIG.settingsManager.saveSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Settings save error:', error);
    return { success: false, error: error.message };
  }
}

// Update JavaScript callback with proper error handling
function save() {
  const settings = {...};
  google.script.run
    .withSuccessHandler((result) => {
      if (result.success) {
        alert('Settings saved successfully!');
        google.script.host.close();
      } else {
        alert('Error saving: ' + result.error);
      }
    })
    .withFailureHandler((error) => {
      alert('Save failed: ' + error.message);
    })
    .saveSettingsWithValidation(settings);
}
```

**Advanced Config Dialog (Tabbed):**
- Tab 1: Proximity & Distance (max_label_distance_px: 200px, max_line_gap: 1)
- Tab 2: Section Priorities (Performance: 40pts, Technical: 35pts, Marketing: 10pts)  
- Tab 3: Extraction Methods (OCR fallback, fuzzy matching threshold)
- Tab 4: Field Priorities (drag-drop reordering of 18 fields)

### ✅ CHECKPOINT 2: Implement Pattern Flexibility Overhaul
**Files to modify:**
- `config/unit_normalization/*.txt` - Update parser rules for flexibility
- `apps-script/extractors.gs` - Enhanced normalize* functions

**Key Pattern Updates:**
1. **Range Separators**: Support `-`, `–`, `~`, `to`, `/`
2. **Unit Spacing**: Handle `°C`, `° C`, `2W(typ)`, `65 m A`
3. **Approximation Symbols**: Parse `≈`, `~`, `(typ)`, `typical`
4. **Dual Units**: Extract primary from `500 g / 1.1 lb` formats
5. **Positive Prefixes**: Clean `+3 to 15` ranges

**Enhanced Dimension Parser:**
```javascript
// Add to normalizeDimensions function
normalizeDimensions(raw) {
  // Support multiple separators: x, ×, *, ·, space
  const separatorPattern = /[x×\*·\s]+/gi;
  const dimensionPattern = /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s*[x×\*·\s]+\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s*[x×\*·\s]+\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?/i;
  
  // Enhanced patterns for space-separated: "135mm 102mm 47mm"
  const spacePattern = /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s+(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?\s+(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)?/i;
  
  // Try both patterns and return best match
}
```

### ✅ CHECKPOINT 3: Multi-Tier Adaptive Field Recovery System
**Files to modify:**
- `apps-script/extractors.gs` - Add adaptive recovery methods
- `config/field_priority.yaml` - Document fallback strategies

**Recovery Tier Architecture:**
```javascript
class AdaptiveFieldRecovery {
  extractFieldWithRecovery(fieldName, text) {
    // Tier 1: Standard extraction
    let result = this.standardExtraction(fieldName, text);
    if (result.confidence >= 70) return result;
    
    // Tier 2: Relaxed pattern matching
    result = this.relaxedPatternExtraction(fieldName, text);
    if (result.confidence >= 50) return result;
    
    // Tier 3: Proximity-based recovery
    result = this.proximityRecovery(fieldName, text);
    if (result.confidence >= 30) return result;
    
    // Tier 4: Section-based extraction
    result = this.sectionBasedExtraction(fieldName, text);
    if (result.confidence >= 20) return result;
    
    // Tier 5: Document-wide fuzzy search
    return this.documentWideSearch(fieldName, text);
  }
}
```

**Recovery Methods by Field Type:**
- **Dimensions**: Standard regex → Space-separated → Any 3 numbers with separators
- **Weight**: Unit-adjacent → Nearby numeric → Section scan for g/kg tokens
- **Temperature**: Range format → Single values → °C tokens anywhere
- **Voltage**: VDC pattern → V pattern → Numeric near "power/input"

### ✅ CHECKPOINT 4: Add Product Description Field
**Files to modify:**
- `config/parsers_manifest.yaml` - Add description field
- `apps-script/extractors.gs` - Add description extraction
- `field_settings/google_sheets_config.json` - Add column V

**Description Extraction Logic:**
```javascript
extractDescription(text) {
  // Look for overview paragraphs in first 1/3 of document
  const lines = text.split('\n');
  const firstThird = lines.slice(0, Math.floor(lines.length / 3));
  
  // Find descriptive paragraphs (2+ sentences, marketing language)
  for (const line of firstThird) {
    if (line.length > 100 && line.includes('.') && 
        !line.match(/\d+\s*(mm|g|Hz|VDC|°C)/)) {
      return line.trim().substring(0, 200) + '...';
    }
  }
  
  // Fallback: Extract bullet points from features section
  return this.extractFeatureBullets(text);
}
```

### ✅ CHECKPOINT 5: Enhanced Confidence Scoring System
**Files to modify:**
- `apps-script/extractors.gs` - Update confidence calculation
- `parser_instructions/confidence_scoring.md` - Document new weights

**Multi-Factor Confidence Scoring:**
```javascript
calculateEnhancedConfidence(candidate, fieldConfig, extractionMethod) {
  let score = 0;
  
  // Source Quality (40% weight)
  score += this.getSectionScore(candidate.context) * 0.4;
  
  // Association Strength (30% weight)  
  score += this.getProximityScore(candidate.distance) * 0.3;
  
  // Pattern Match Quality (20% weight)
  score += this.getPatternScore(candidate.raw, fieldConfig) * 0.2;
  
  // Extraction Method Reliability (10% weight)
  score += this.getMethodScore(extractionMethod) * 0.1;
  
  return Math.min(100, Math.max(0, score));
}
```

### ✅ CHECKPOINT 6: Image Caption Protection & Content Classification
**Files to modify:**
- `parser_instructions/pdf_layout_detection.md` - Update classification rules
- `apps-script/extractors.gs` - Add content filtering

**Enhanced Content Filtering:**
```javascript
filterNonSpecificationContent(candidates) {
  return candidates.filter(candidate => {
    // Remove marketing captions
    if (this.isMarketingContent(candidate.context)) return false;
    
    // Remove image captions (no label-value structure)
    if (this.isImageCaption(candidate.context)) return false;
    
    // Require specification-like context
    return this.hasSpecificationContext(candidate.context);
  });
}
```

---

## 🔧 Implementation Priority Matrix

### **HIGH PRIORITY (Complete First):**
1. **Save Settings Fix** - Users can't currently save changes
2. **Pattern Flexibility** - Addresses core extraction failures  
3. **Adaptive Recovery** - Dramatically improves success rate

### **MEDIUM PRIORITY:**
4. **Advanced Config UI** - User control over extraction parameters
5. **Description Field** - Adds valuable context without risk

### **LOW PRIORITY:**
6. **Enhanced Confidence** - Refinement after core issues fixed

---

## 📊 Success Metrics

### **Before Implementation:**
- Extraction Success Rate: ~60-70%
- Failed Fields: dimensions, operating_temperature, weight
- User Control: Basic confidence thresholds only

### **After Implementation Targets:**
- Extraction Success Rate: **90%+**
- Failed Fields: **<10% across all field types**
- User Control: **Full parameter customization**
- Fallback Coverage: **5-tier recovery system**

---

## 🚨 Risk Mitigation

### **Rollback Strategy:**
- Each checkpoint creates isolated commit
- Advanced features are additive (don't break existing)
- Config changes are backward-compatible
- All new functions have fallbacks to existing methods

### **Testing Approach:**
- Test each checkpoint with provided PDF examples
- Verify S66UFH-Lite.txt and PolaNt MC.v2.txt after each change
- Maintain existing functionality while adding enhancements

### **Breaking Change Prevention:**
- New advanced settings use defaults matching current behavior
- Pattern changes are additive (old patterns + new flexibility)
- Recovery system only activates when standard extraction fails

---

## 📝 Commit Message Template

```
[CHECKPOINT X]: [feature] - [brief description] (plan-item-X)

- [Specific change 1]
- [Specific change 2]  
- [Specific change 3]
- Maintains backward compatibility with existing extractions
- Tested with: [PDF examples used]
```

---

## 🗑️ Auto-Deletion Notice

**This file should be deleted after implementation completion.**

Check completion status:
- [ ] Checkpoint 1: Save Settings Fix + Advanced Config
- [ ] Checkpoint 2: Pattern Flexibility Overhaul  
- [ ] Checkpoint 3: Multi-Tier Adaptive Recovery
- [ ] Checkpoint 4: Product Description Field
- [ ] Checkpoint 5: Enhanced Confidence Scoring
- [ ] Checkpoint 6: Content Classification Enhancement

**When all checkpoints complete:** Delete this file and update main README.md with new capabilities.

---

*Implementation Plan Created: September 2, 2025*
*Target Completion: All 6 checkpoints within development session*
*Total Estimated Changes: ~200-300 lines across 8 files*
