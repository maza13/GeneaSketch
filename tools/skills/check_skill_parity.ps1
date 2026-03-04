param(
  [string]$SourceRoot = ".agents/skills",
  [string]$DestinationRoot = ".agent/skills",
  [string[]]$CriticalSkills = @(
    "geneasketch-ux-governor",
    "customizing-tauri-windows",
    "d3-viz",
    "ui-animation",
    "geneasketch-docs-manager",
    "gsk-engine-architect"
  )
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SourceRoot)) { throw "Source path not found: $SourceRoot" }
if (-not (Test-Path $DestinationRoot)) { throw "Destination path not found: $DestinationRoot" }

$sourceSkills = Get-ChildItem -Path $SourceRoot -Directory | Select-Object -ExpandProperty Name | Sort-Object
$destSkills = Get-ChildItem -Path $DestinationRoot -Directory | Select-Object -ExpandProperty Name | Sort-Object

$missingInDest = $sourceSkills | Where-Object { $_ -notin $destSkills }
$missingInSource = $destSkills | Where-Object { $_ -notin $sourceSkills }

$hashMismatches = @()
foreach ($skill in $CriticalSkills) {
  $srcSkill = Join-Path $SourceRoot "$skill/SKILL.md"
  $dstSkill = Join-Path $DestinationRoot "$skill/SKILL.md"

  if (-not (Test-Path $srcSkill)) {
    $hashMismatches += "CRITICAL_MISSING_SOURCE:$skill"
    continue
  }
  if (-not (Test-Path $dstSkill)) {
    $hashMismatches += "CRITICAL_MISSING_DEST:$skill"
    continue
  }

  $srcHash = (Get-FileHash $srcSkill -Algorithm SHA256).Hash
  $dstHash = (Get-FileHash $dstSkill -Algorithm SHA256).Hash
  if ($srcHash -ne $dstHash) {
    $hashMismatches += "CRITICAL_HASH_MISMATCH:$skill"
  }
}

Write-Output "PARITY_REPORT"
Write-Output "SOURCE_COUNT=$($sourceSkills.Count)"
Write-Output "DEST_COUNT=$($destSkills.Count)"
Write-Output "MISSING_IN_DEST=$($missingInDest.Count)"
Write-Output "MISSING_IN_SOURCE=$($missingInSource.Count)"
Write-Output "CRITICAL_MISMATCHES=$($hashMismatches.Count)"

if ($missingInDest.Count -gt 0) {
  Write-Output "-- Missing in destination --"
  $missingInDest | ForEach-Object { Write-Output $_ }
}
if ($missingInSource.Count -gt 0) {
  Write-Output "-- Missing in source --"
  $missingInSource | ForEach-Object { Write-Output $_ }
}
if ($hashMismatches.Count -gt 0) {
  Write-Output "-- Critical mismatches --"
  $hashMismatches | ForEach-Object { Write-Output $_ }
}

if ($missingInDest.Count -gt 0 -or $missingInSource.Count -gt 0 -or $hashMismatches.Count -gt 0) {
  exit 1
}

Write-Output "PARITY_OK"
exit 0
