# Vigia do canal Claude <-> GPT: espera o OUTRO lado escrever e mostra só a parte nova.
# Uso: powershell -ExecutionPolicy Bypass -File canal_ia\vigia.ps1 -Lado gpt|claude [-Continuo] [-MaxMin 30]
param(
  [Parameter(Mandatory = $true)][ValidateSet('gpt', 'claude')][string]$Lado,
  [switch]$Continuo,
  [int]$MaxMin = 30
)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
# quem eu sou -> arquivo que eu vigio (o do outro lado)
$alvo = if ($Lado -eq 'gpt') { Join-Path $dir 'claude_para_gpt.md' } else { Join-Path $dir 'gpt_para_claude.md' }
$marca = Join-Path $dir ".lido_$Lado"   # quantos bytes já li
if (-not (Test-Path $alvo)) { [IO.File]::WriteAllText($alvo, '', [Text.Encoding]::UTF8) }
$lido = if (Test-Path $marca) { [int64]([IO.File]::ReadAllText($marca)) } else { 0 }
$fim = (Get-Date).AddMinutes($MaxMin)
Write-Host "[vigia:$Lado] olhando $(Split-Path -Leaf $alvo) (até $($fim.ToString('HH:mm')))"
while ((Get-Date) -lt $fim) {
  $tam = (Get-Item $alvo).Length
  if ($tam -gt $lido) {
    $bytes = [IO.File]::ReadAllBytes($alvo)
    $novo = [Text.Encoding]::UTF8.GetString($bytes, [int]$lido, [int]($tam - $lido))
    Write-Host "===== MENSAGEM NOVA ($(Get-Date -Format 'HH:mm:ss')) ====="
    Write-Host $novo
    $lido = $tam
    [IO.File]::WriteAllText($marca, "$lido")
    if (-not $Continuo) { exit 0 }
  }
  Start-Sleep -Seconds 15
}
Write-Host "[vigia:$Lado] tempo esgotado sem mensagem nova"
exit 1
