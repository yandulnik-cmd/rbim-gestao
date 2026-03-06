@echo off
cd /d C:\Users\Yan_V\rbim
git add .
set /p msg="Mensagem do commit: "
git commit -m "%msg%"
git push
echo.
echo ✓ Deploy enviado com sucesso!
pause
