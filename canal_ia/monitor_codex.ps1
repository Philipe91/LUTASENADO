# Monitor de uso do Codex (GPT). Lê o rate_limits mais recente das sessões em ~/.codex/sessions.
# Limite do usuário: uso SEMANAL (secondary, janela 10080 min) não pode passar de 60%.
# A cada 10 min: grava canal_ia/codex_uso.txt; se semanal >= 55% escreve AVISO de parada para o GPT (uma vez).
param([int]$Limite = 55, [int]$Minutos = 600)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $dir 'codex_uso.txt'
$avisado = $false
$fim = (Get-Date).AddMinutes($Minutos)
while ((Get-Date) -lt $fim) {
  $f = Get-ChildItem "$env:USERPROFILE\.codex\sessions" -Recurse -Filter *.jsonl | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($f) {
    $linha = Select-String -Path $f.FullName -Pattern '"rate_limits"' | Select-Object -Last 1
    if ($linha -and $linha.Line -match '"secondary":\{"used_percent":([\d.]+)') {
      $sem = [double]$Matches[1]
      $pri = if ($linha.Line -match '"primary":\{"used_percent":([\d.]+)') { $Matches[1] } else { '?' }
      "$(Get-Date -Format 'yyyy-MM-dd HH:mm') semanal=$sem% janela5h=$pri%" | Add-Content $out
      if ($sem -ge $Limite -and -not $avisado) {
        $msg = "`n## [C-AUTO] $(Get-Date -Format 'yyyy-MM-dd HH:mm') - AVISO - LIMITE CODEX`nUso semanal do Codex em $sem% (limite do usuario: 60%). GPT: PARE de trabalhar agora (nao rode vigia/heartbeat). Claude segue sozinho com os lotes ja acordados e registra tudo para revisao depois.`n"
        [IO.File]::AppendAllText((Join-Path $dir 'claude_para_gpt.md'), $msg, [Text.Encoding]::UTF8)
        $avisado = $true
      }
    }
  }
  Start-Sleep -Seconds 600
}
