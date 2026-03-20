@echo off
setlocal enabledelayedexpansion
cd /d C:\Users\Yan_V\rbim

echo 🔍 Verificando status do Git...
git fetch origin main

git status | findstr "ahead" > nul
if %errorlevel% equ 0 (
    echo.
    echo ⚠️  Existem commits locais não enviados.
)

git status | findstr "behind" > nul
if %errorlevel% equ 0 (
    echo.
    echo 📥 Recebendo atualizações do servidor...
    git pull --rebase origin main
    if %errorlevel% neq 0 (
        echo ❌ Erro ao sincronizar. Resolva os conflitos manualmente.
        pause
        exit /b 1
    )
)

git add .
set /p msg="Mensagem do commit: "
if "!msg!"=="" set msg=Update %date% %time%

git commit -m "!msg!"
if %errorlevel% neq 0 (
    echo.
    echo ℹ️  Nada para commitar ou erro no commit.
)

echo.
echo 🚀 Enviando para o GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ✓ Deploy enviado com sucesso!
) else (
    echo.
    echo ❌ Falha no envio. Tente realizar um 'git pull' manualmente ou verifique sua conexão.
)

pause
