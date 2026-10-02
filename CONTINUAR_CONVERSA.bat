@echo off
chcp 65001 >nul
REM Abre o Claude Code na pasta do República Kombat para continuar o trabalho.
REM 1 = retoma ESTA conversa (mesmo histórico)  |  2 = conversa nova que lê CONVERSA_CONTINUAR.md
title Republica Kombat - Claude Code
cd /d "%~dp0"
set "CLAUDE=%USERPROFILE%\.local\bin\claude.exe"
if not exist "%CLAUDE%" set "CLAUDE=claude"

echo.
echo  REPUBLICA KOMBAT  ^|  continuar com o Claude
echo  ------------------------------------------------
echo   1 - Retomar a conversa de 30/09-02/10 (mesmo historico)
echo   2 - Conversa nova lendo CONVERSA_CONTINUAR.md (mais leve)
echo   3 - Retomar a ultima conversa desta pasta
echo.
choice /c 123 /n /m "Escolha 1, 2 ou 3: "
if errorlevel 3 goto ultima
if errorlevel 2 goto nova

"%CLAUDE%" --resume 5cae80b3-5d65-43e5-9f09-87b9750f7431
goto fim

:nova
"%CLAUDE%" "Leia D:\projetos\GAMELUTA\CONVERSA_CONTINUAR.md, MOVESET_PLANO.md e CHATGPT_DESIGN.md e continue o projeto de onde parou. Limite: no maximo 65%% do uso semanal."
goto fim

:ultima
"%CLAUDE%" --continue

:fim
pause
