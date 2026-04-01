@echo off
setlocal enabledelayedexpansion
<<<<<<< HEAD
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
=======
cd /d "%~dp0"

where git >nul 2>&1
if %errorlevel% neq 0 (
    set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
    if not exist "!GIT_EXE!" set "GIT_EXE=C:\Users\%USERNAME%\AppData\Local\Programs\Git\cmd\git.exe"
    if not exist "!GIT_EXE!" (
        echo.
        echo [ERRO] Git nao encontrado no PATH.
        echo Instale o Git ou abra este script em um terminal com Git disponivel.
        pause
        exit /b 1
    )
    set "GIT=!GIT_EXE!"
) else (
    set "GIT=git"
)

"%GIT%" rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Esta pasta nao e um repositorio Git.
    pause
    exit /b 1
)

for /f "delims=" %%b in ('"%GIT%" rev-parse --abbrev-ref HEAD 2^>nul') do set "branch=%%b"
if "!branch!"=="" set "branch=main"

echo.
echo Verificando status do Git na branch !branch!...
"%GIT%" fetch origin !branch!
if %errorlevel% neq 0 (
    echo [ERRO] Nao foi possivel buscar dados do remoto origin/!branch!.
    pause
    exit /b 1
)

for /f %%i in ('"%GIT%" rev-list --count origin/!branch!..HEAD 2^>nul') do set "ahead=%%i"
if not defined ahead set "ahead=0"
if !ahead! gtr 0 (
    echo.
    echo [AVISO] Existem !ahead! commit^(s^) local^(is^) ainda nao enviados.
)

for /f %%i in ('"%GIT%" rev-list --count HEAD..origin/!branch! 2^>nul') do set "behind=%%i"
if not defined behind set "behind=0"
if !behind! gtr 0 (
    echo.
    echo Recebendo !behind! atualizacao^(oes^) do servidor...
    "%GIT%" pull --rebase origin !branch!
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao sincronizar. Resolva conflitos manualmente.
>>>>>>> eef5f1d (Update 01/04/2026 13:11:45,38)
        pause
        exit /b 1
    )
)

<<<<<<< HEAD
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
=======
"%GIT%" add .
"%GIT%" diff --cached --quiet
if %errorlevel% equ 0 (
    echo.
    echo [INFO] Nada para commitar.
) else (
    set /p msg="Mensagem do commit: "
    if "!msg!"=="" set msg=Update %date% %time%

    "%GIT%" commit -m "!msg!"
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao criar commit.
        pause
        exit /b 1
    )
)

echo.
echo Enviando para o GitHub...
"%GIT%" push origin !branch!
if %errorlevel% equ 0 (
    echo.
    echo [OK] Deploy enviado com sucesso.
) else (
    echo.
    echo [ERRO] Falha no envio. Tente executar git pull manualmente e tente novamente.
>>>>>>> eef5f1d (Update 01/04/2026 13:11:45,38)
)

pause
