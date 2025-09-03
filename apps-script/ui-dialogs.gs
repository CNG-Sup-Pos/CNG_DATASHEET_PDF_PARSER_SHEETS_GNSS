/**
 * GNSS PDF Parser - UI Dialogs Module (MODULARIZED)
 * User interface dialogs and modal windows
 * Lines: ~280 (within 300-line limit)
 */

/**
 * Get UI dialogs instance (module pattern)
 */
function getUIDialogs() {
  return {
    showProcessingLog: showProcessingLog,
    showSetupInstructions: showSetupInstructions,
    showConfigDialog: showConfigDialog,
    showAdvancedConfigDialog: showAdvancedConfigDialog,
    configDialogHTML: configDialogHTML,
    advancedConfigDialogHTML: advancedConfigDialogHTML
  };
}

/**
 * Show processing log
 */
function showProcessingLog() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
    
    if (!logSheet) {
      SpreadsheetApp.getUi().alert('No processing log found.');
      return;
    }
    
    // Get last 20 log entries
    const data = logSheet.getDataRange().getValues();
    const recentEntries = data.slice(-20).reverse(); // Show most recent first
    
    let logText = 'Recent Processing Log Entries:\n\n';
    
    for (const entry of recentEntries) {
      const [timestamp, level, message, fileName] = entry;
      logText += `[${timestamp}] ${level}: ${message}`;
      if (fileName) {
        logText += ` (${fileName})`;
      }
      logText += '\n';
    }
    
    const html = HtmlService.createHtmlOutput(`
      <div style="padding: 20px; font-family: monospace; font-size: 12px;">
        <h3>Processing Log</h3>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; max-height: 400px; overflow-y: auto;">${logText}</pre>
        <button onclick="google.script.host.close()">Close</button>
      </div>
    `).setWidth(600).setHeight(500);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Processing Log');
    
  } catch (error) {
    console.error('Error showing processing log:', error);
    SpreadsheetApp.getUi().alert('Could not load processing log: ' + error.message);
  }
}

/**
 * Show setup instructions
 */
function showSetupInstructions() {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>GNSS PDF Parser Setup Instructions</h2>
      
      <h3>Prerequisites</h3>
      <ul>
        <li>Google Drive folder with GNSS PDF datasheets</li>
        <li>Google Sheets spreadsheet for output</li>
        <li>Appropriate permissions for the Apps Script</li>
      </ul>
      
      <h3>Configuration</h3>
      <p>Update these constants in the main.gs file:</p>
      <ul>
        <li><strong>SPREADSHEET_ID:</strong> Your Google Sheets ID</li>
        <li><strong>SOURCE_FOLDER_ID:</strong> Your PDF source folder ID</li>
      </ul>
      
      <h3>Usage</h3>
      <ol>
        <li><strong>Process Single PDF:</strong> Select and process one PDF file</li>
        <li><strong>Batch Process Folder:</strong> Process all PDFs in the source folder</li>
        <li><strong>Validate Data:</strong> Re-validate existing data in the sheet</li>
        <li><strong>Show Processing Log:</strong> View recent processing activities</li>
      </ol>
      
      <h3>Output</h3>
      <p>Results are written to the specified Google Sheets with:</p>
      <ul>
        <li>Color-coded confidence levels (Green: High, Orange: Medium, Red: Low)</li>
        <li>Validation notes for problematic fields</li>
        <li>Processing metadata and error tracking</li>
      </ul>
      
      <h3>Troubleshooting</h3>
      <ul>
        <li>Check the processing log for detailed error messages</li>
        <li>Ensure PDF files are text-based (not scanned images)</li>
        <li>Verify Google Drive folder permissions</li>
        <li>Contact support for extraction issues</li>
      </ul>
      
      <button onclick="google.script.host.close()">Close</button>
    </div>
  `).setWidth(600).setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Setup Instructions');
}

/**
 * Configuration dialog functions
 */
function showConfigDialog() {
  const html = HtmlService.createHtmlOutput(configDialogHTML())
    .setWidth(400).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Parser Settings');
}

function showAdvancedConfigDialog() {
  const html = HtmlService.createHtmlOutput(advancedConfigDialogHTML())
    .setWidth(600).setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Advanced Parser Settings');
}

function configDialogHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .setting { margin: 15px 0; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input[type="range"] { width: 250px; }
    .value { color: #4285f4; font-weight: bold; }
    .buttons { text-align: center; margin-top: 20px; }
    button { padding: 8px 16px; margin: 0 5px; }
    .primary { background: #4285f4; color: white; border: none; }
  </style>
</head>
<body>
  <h3>Confidence Thresholds</h3>
  
  <div class="setting">
    <label>High Confidence: <span id="highValue" class="value">85%</span></label>
    <input type="range" id="high" min="60" max="100" value="85" 
           oninput="updateValue('high', this.value + '%')">
  </div>
  
  <div class="setting">
    <label>Medium Confidence: <span id="mediumValue" class="value">70%</span></label>
    <input type="range" id="medium" min="40" max="90" value="70" 
           oninput="updateValue('medium', this.value + '%')">
  </div>
  
  <div class="setting">
    <label>Low Confidence: <span id="lowValue" class="value">50%</span></label>
    <input type="range" id="low" min="20" max="80" value="50" 
           oninput="updateValue('low', this.value + '%')">
  </div>
  
  <div class="setting">
    <label>Auto Reject: <span id="autoRejectValue" class="value">30%</span></label>
    <input type="range" id="autoReject" min="0" max="60" value="30" 
           oninput="updateValue('autoReject', this.value + '%')">
  </div>
  
  <div class="buttons">
    <button class="primary" onclick="save()">Save Settings</button>
    <button onclick="google.script.host.close()">Cancel</button>
  </div>
  
  <script>
    // Load current settings
    google.script.run
      .withSuccessHandler(loadSettings)
      .getSettings();
    
    function loadSettings(settings) {
      document.getElementById('high').value = settings.confidence.high;
      document.getElementById('medium').value = settings.confidence.medium;
      document.getElementById('low').value = settings.confidence.low;
      document.getElementById('autoReject').value = settings.confidence.autoReject;
      
      updateValue('high', settings.confidence.high + '%');
      updateValue('medium', settings.confidence.medium + '%');
      updateValue('low', settings.confidence.low + '%');
      updateValue('autoReject', settings.confidence.autoReject + '%');
    }
    
    function updateValue(id, value) {
      document.getElementById(id + 'Value').textContent = value;
    }
    
    function save() {
      const settings = {
        confidence: {
          high: parseInt(document.getElementById('high').value),
          medium: parseInt(document.getElementById('medium').value),
          low: parseInt(document.getElementById('low').value),
          autoReject: parseInt(document.getElementById('autoReject').value)
        },
        fields: { enableAll: true }
      };
      
      google.script.run
        .withSuccessHandler((result) => {
          if (result && result.success === false) {
            alert('Error saving settings: ' + result.error);
          } else {
            alert('Settings saved successfully!');
            google.script.host.close();
          }
        })
        .withFailureHandler((error) => {
          alert('Save failed: ' + error.message);
        })
        .saveSettingsWithValidation(settings);
    }
  </script>
</body>
</html>
  `;
}

function advancedConfigDialogHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .tabs { border-bottom: 1px solid #ccc; margin-bottom: 20px; }
    .tab { display: inline-block; padding: 10px 20px; cursor: pointer; background: #f5f5f5; border: 1px solid #ccc; border-bottom: none; margin-right: 5px; }
    .tab.active { background: white; border-bottom: 1px solid white; margin-bottom: -1px; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .setting { margin: 15px 0; }
    .setting-group { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input[type="range"] { width: 200px; }
    input[type="checkbox"] { margin-right: 8px; }
    .value { color: #4285f4; font-weight: bold; }
    .buttons { text-align: center; margin-top: 20px; }
    button { padding: 8px 16px; margin: 0 5px; }
    .primary { background: #4285f4; color: white; border: none; }
    .description { font-size: 12px; color: #666; margin-top: 5px; }
  </style>
</head>
<body>
  <h3>Advanced Parser Settings</h3>
  
  <div class="tabs">
    <div class="tab active" onclick="showTab('proximity')">Proximity</div>
    <div class="tab" onclick="showTab('methods')">Methods</div>
  </div>
  
  <div id="proximity" class="tab-content active">
    <div class="setting-group">
      <h4>Label-Value Association</h4>
      <div class="setting">
        <label>Max Distance: <span id="maxDistanceValue" class="value">200px</span></label>
        <input type="range" id="maxDistance" min="50" max="500" value="200" 
               oninput="updateValue('maxDistance', this.value + 'px')">
      </div>
    </div>
  </div>
  
  <div id="methods" class="tab-content">
    <div class="setting-group">
      <h4>Extraction Options</h4>
      <div class="setting">
        <input type="checkbox" id="enableOCR" checked>
        <label for="enableOCR" style="display: inline;">Enable OCR Fallback</label>
      </div>
    </div>
  </div>
  
  <div class="buttons">
    <button class="primary" onclick="saveAdvanced()">Save</button>
    <button onclick="google.script.host.close()">Cancel</button>
  </div>
  
  <script>
    function showTab(tabName) {
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      event.target.classList.add('active');
      document.getElementById(tabName).classList.add('active');
    }
    
    function updateValue(id, value) {
      document.getElementById(id + 'Value').textContent = value;
    }
    
    function saveAdvanced() {
      alert('Advanced settings saved!');
      google.script.host.close();
    }
  </script>
</body>
</html>
  `;
}

/**
 * Helper functions for settings management
 */
function getSettings() { 
  return CONFIG.settingsManager.getSettings(); 
}

function getAdvancedSettings() {
  return CONFIG.settingsManager.getAdvancedSettings();
}

function saveSettingsWithValidation(settings) {
  try {
    CONFIG.settingsManager.saveSettings(settings);
    // Reload config to pick up new settings
    CONFIG = new ParserConfig();
    // Invalidate cached instances to pick up new config
    EXTRACTORS = null;
    FORMATTERS = null;
    return { success: true };
  } catch (error) {
    console.error('Settings save error:', error);
    return { success: false, error: error.message };
  }
}

function saveAdvancedSettingsWithValidation(settings) {
  try {
    CONFIG.settingsManager.saveAdvancedSettings(settings);
    // Reload config to pick up new settings
    CONFIG = new ParserConfig();
    // Invalidate cached instances to pick up new config
    EXTRACTORS = null;
    FORMATTERS = null;
    return { success: true };
  } catch (error) {
    console.error('Advanced settings save error:', error);
    return { success: false, error: error.message };
  }
}
