/**
 * GNSS PDF Parser - Value Normalizers Module (MODULARIZED)
 * Value normalization and formatting utilities
 * Lines: ~248 (within 300-line limit)
 */

/**
 * Get value normalizers instance (module pattern)
 */
function getValueNormalizers() {
  return new ValueNormalizers();
}

class ValueNormalizers {
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
   */
  normalizeDimensions(raw) {
    const match = raw.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*[×x]?\s*(\d+(?:[.,]\d+)?)?/i);
    if (!match) return raw;
    
    const [, width, height, depth] = match;
    const w = parseFloat(width.replace(',', '.'));
    const h = parseFloat(height.replace(',', '.'));
    const d = depth ? parseFloat(depth.replace(',', '.')) : null;
    
    return d ? `${w} × ${h} × ${d} mm` : `${w} × ${h} mm`;
  }

  /**
   * Normalize weight to grams
   */
  normalizeWeight(raw) {
    const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|grams?|kilograms?|lb|pound|oz)/i);
    if (!match) return raw;
    
    const [, value, unit] = match;
    let weight = parseFloat(value.replace(',', '.'));
    
    // Convert to grams
    if (unit.toLowerCase().startsWith('kg')) {
      weight *= 1000;
    } else if (unit.toLowerCase().startsWith('lb') || unit.toLowerCase().startsWith('pound')) {
      weight *= 453.592;
    } else if (unit.toLowerCase().startsWith('oz') || unit.toLowerCase().startsWith('ounce')) {
      weight *= 28.3495;
    }
    
    return weight + ' g';
  }

  /**
   * Normalize temperature range
   */
  normalizeTemperature(raw) {
    const cleanedRaw = raw.replace(/[≈~]/g, '').replace(/\(typ\)|typical/gi, '');
    
    const rangePattern = /([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|°\s*C|C)?\s*(?:to|–|-|~|\/)\s*([-+]?\d+(?:[.,]\d+)?)\s*(?:°C|°\s*C|C)?/i;
    let match = cleanedRaw.match(rangePattern);
    
    if (!match) {
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
   */
  normalizeVoltage(raw) {
    const cleanedRaw = raw.replace(/\+(\d)/g, '$1');
    
    const rangePattern = /(\d+(?:[.,]\d+)?)\s*(?:[–\-~]|to|\/)\s*(\d+(?:[.,]\d+)?)\s*(VDC|VAC|V|VCC|volts?)/i;
    let match = cleanedRaw.match(rangePattern);
    
    if (!match) {
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
   */
  normalizePower(raw) {
    const cleanedRaw = raw.replace(/[≈~]/g, '').replace(/\(typ\)|typical/gi, '');
    
    const powerPattern = /(\d+(?:[.,]\d+)?)\s*(?:mA|mW|W|watts?|milliwatts?|milliamps?)/i;
    const match = cleanedRaw.match(powerPattern);
    
    if (!match) return raw;
    
    const [, value] = match;
    const power = parseFloat(value.replace(',', '.'));
    
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
   */
  normalizeAccuracy(raw) {
    const accuracyPattern = /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m)\s*(?:\+\s*(\d+(?:[.,]\d+)?)\s*ppm)?/i;
    let match = raw.match(accuracyPattern);
    
    if (!match) {
      const altPattern = /[±]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)/i;
      match = raw.match(altPattern);
      if (match) {
        const [, value, unit] = match;
        let accuracy = parseFloat(value.replace(',', '.'));
        
        if (unit.toLowerCase() === 'mm') accuracy /= 10;
        if (unit.toLowerCase() === 'm') accuracy *= 100;
        
        return '± ' + accuracy + ' cm';
      }
      return raw;
    }
    
    const [, value, unit, ppm] = match;
    let accuracy = parseFloat(value.replace(',', '.'));
    
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
   */
  normalizeTimeSync(raw) {
    const cleanedRaw = raw.replace(/[≈~]/g, '').replace(/\(typ\)|typical/gi, '');
    
    const timeSyncPattern = /(?:[±]\s*)?(\d+(?:[.,]\d+)?)\s*(ns|μs|nanoseconds?|microseconds?)/i;
    const match = cleanedRaw.match(timeSyncPattern);
    
    if (!match) return raw;
    
    const [, value, unit] = match;
    let accuracy = parseFloat(value.replace(',', '.'));
    
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
   * Normalize text fields
   */
  normalizeText(raw) {
    return raw.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalize product description
   */
  normalizeDescription(raw) {
    let cleaned = raw.trim();
    
    cleaned = cleaned.replace(/^(Description|Overview|Features?):\s*/i, '');
    cleaned = cleaned.replace(/^[•·\-\*]\s*/, '');
    
    if (cleaned.length > 200) {
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
}
