param(
  [string]$SourceRoot = ".agents/skills",
  [string]$DestinationRoot = ".agents/skills",
  [switch]$Prune
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SourceRoot)) {
  throw "Source path not found: $SourceRoot"
}

New-Item -Path $DestinationRoot -ItemType Directory -Force | Out-Null

$sourceSkills = Get-ChildItem -Path $SourceRoot -Directory | Select-Object -ExpandProperty Name
$copied = @()

foreach ($skill in $sourceSkills) {
  $src = Join-Path $SourceRoot $skill
  $dst = Join-Path $DestinationRoot $skill
  New-Item -Path $dst -ItemType Directory -Force | Out-Null

  $null = robocopy $src $dst /MIR /NFL /NDL /NJH /NJS /NP
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed for skill '$skill' with exit code $LASTEXITCODE"
  }
  $copied += $skill
}

$removed = @()
if ($Prune) {
  $destSkills = Get-ChildItem -Path $DestinationRoot -Directory | Select-Object -ExpandProperty Name
  foreach ($skill in $destSkills) {
    if ($skill -notin $sourceSkills) {
      Remove-Item -Path (Join-Path $DestinationRoot $skill) -Recurse -Force
      $removed += $skill
    }
  }
}

Write-Output "SYNC_OK"
Write-Output "COPIED_COUNT=$($copied.Count)"
if ($Prune) { Write-Output "REMOVED_COUNT=$($removed.Count)" }
