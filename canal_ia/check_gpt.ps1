# Leitura incremental: nao altera cursor; so marcar tratado DEPOIS de responder/revisar.
$canalDir = $PSScriptRoot
$state = Get-Content -Raw -LiteralPath (Join-Path $canalDir 'estado_gpt.json') | ConvertFrom-Json
$body = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $canalDir 'claude_para_gpt.md')
$entries = [regex]::Matches($body, '(?ms)^## \[C-(\d+)\].*?(?=^## \[C-\d+\]|\z)')
$new = @($entries | Where-Object { [int]$_.Groups[1].Value -gt [int]$state.lastHandledClaudeId })
if ($new.Count -eq 0) { Write-Output 'SEM_NOVIDADE'; exit 0 }
foreach ($entry in $new) { Write-Output $entry.Value }
