# Create Master Executor Utility
# This script sets up the master executor for modularization

Write-Host "🔧 Creating Enhanced Modularization Master Executor..." -ForegroundColor Cyan

# Check if master executor already exists
if (Test-Path "modularization-master-executor.ps1") {
    Write-Host "✅ Master executor already exists: modularization-master-executor.ps1" -ForegroundColor Green
    Write-Host "📋 Ready to run: .\modularization-master-executor.ps1 -AutoConfirm -CreateBackups -RunTests" -ForegroundColor Yellow
} else {
    Write-Host "❌ Master executor not found. Please ensure modularization-master-executor.ps1 exists." -ForegroundColor Red
    Write-Host "📋 Check the implementation plan for setup instructions." -ForegroundColor Yellow
}

# Display usage instructions
Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║                        USAGE INSTRUCTIONS                        ║
╠══════════════════════════════════════════════════════════════════╣
║  AUTOMATED EXECUTION (Recommended):                             ║
║  .\modularization-master-executor.ps1 -AutoConfirm              ║
║                                                                  ║
║  MANUAL CONFIRMATION:                                            ║
║  .\modularization-master-executor.ps1                           ║
║                                                                  ║
║  EMERGENCY RECOVERY:                                             ║
║  .\modularization-master-executor.ps1 -RecoveryLevel 1          ║
║                                                                  ║
║  PARAMETERS:                                                     ║
║  -AutoConfirm    : Skip manual confirmation                     ║
║  -CreateBackups  : Create triple backup system (default: true)  ║
║  -RunTests       : Run enhanced checkpoint testing (default: true) ║
║  -SelfDelete     : Self-delete on completion (default: false)   ║
║  -RecoveryLevel  : Emergency recovery (1-4)                     ║
╚══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

Write-Host "🎯 Next Action: Run the master executor to begin automated modularization" -ForegroundColor Green
