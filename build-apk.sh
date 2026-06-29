#!/bin/bash
# Primera vez: copiar el proyecto completo a Windows, cd a esa carpeta, npm install, npx cap sync

WIN_PROJECT_POSIX="/mnt/c/Users/gi/proyectos/comanda-taqueria"
WIN_PROJECT='C:\Users\gi\proyectos\comanda-taqueria'
STUDIO='/mnt/c/Program Files/Android/Android Studio/bin/studio64.exe'

# 1. Copiar archivos web a Windows
mkdir -p "$WIN_PROJECT_POSIX/www"
cp www/index.html www/styles.css www/app.js "$WIN_PROJECT_POSIX/www/"
echo "✔ Archivos web copiados"

# Sincronizar plugin Java parcheado a Windows
PLUGIN_SRC="node_modules/capacitor-tcp-socket/android/src/main/java/com/svend/plugins/tcp/socket/TcpSocketPlugin.java"
PLUGIN_DST="$WIN_PROJECT_POSIX/node_modules/capacitor-tcp-socket/android/src/main/java/com/svend/plugins/tcp/socket/TcpSocketPlugin.java"
cp "$PLUGIN_SRC" "$PLUGIN_DST"
echo "✔ Plugin Java sincronizado"

# 2. cap sync desde la carpeta Windows
powershell.exe -Command "Set-Location '$WIN_PROJECT'; npx cap sync"
echo "✔ cap sync terminado"

# 3. Abrir Android Studio apuntando al proyecto android/
"$STUDIO" "$WIN_PROJECT\\android" &
echo "✔ Android Studio abriendo..."
