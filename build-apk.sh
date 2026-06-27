#!/bin/bash
# Primera vez: copiar el proyecto completo a Windows, cd a esa carpeta, npm install, npx cap sync

WIN_PROJECT_POSIX="/mnt/c/Users/gi/proyectos/comanda-taqueria"
WIN_PROJECT='C:\Users\gi\proyectos\comanda-taqueria'
STUDIO='/mnt/c/Program Files/Android/Android Studio/bin/studio64.exe'

# 1. Copiar archivos web a Windows
mkdir -p "$WIN_PROJECT_POSIX/www"
cp www/index.html www/styles.css www/app.js "$WIN_PROJECT_POSIX/www/"
echo "✔ Archivos web copiados"

# 2. cap sync desde la carpeta Windows
powershell.exe -Command "Set-Location '$WIN_PROJECT'; npx cap sync"
echo "✔ cap sync terminado"

# 3. Abrir Android Studio apuntando al proyecto android/
"$STUDIO" "$WIN_PROJECT\\android" &
echo "✔ Android Studio abriendo..."
