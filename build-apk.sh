# Prerequisiti
# 1. Node.js installato
# 2. Android Studio installato
# 3. Android SDK configurato
# 4. Java Development Kit (JDK) installato

# Passaggio 1: Inizializza un progetto Node.js
mkdir ar-app
cd ar-app
npm init -y

# Passaggio 2: Installa Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Passaggio 3: Inizializza Capacitor
npx cap init ARGeolocalizzata com.example.argeolocalizzata --web-dir .

# Passaggio 4: Copia i file web nella directory principale
# [Copia manualmente i file HTML, CSS e JS che abbiamo creato]

# Passaggio 5: Aggiungi la piattaforma Android
npx cap add android

# Passaggio 6: Modifica il file AndroidManifest.xml per aggiungere i permessi
# Path: android/app/src/main/AndroidManifest.xml
# Aggiungi questi permessi:
# <uses-permission android:name="android.permission.INTERNET" />
# <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
# <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
# <uses-permission android:name="android.permission.CAMERA" />

# Passaggio 7: Sincronizza il progetto con le modifiche
npx cap sync

# Passaggio 8: Apri il progetto in Android Studio
npx cap open android

# In Android Studio:
# 1. Attendi che il progetto venga caricato e sincronizzato
# 2. Collega un dispositivo Android o usa un emulatore
# 3. Seleziona "Build > Build Bundle(s) / APK(s) > Build APK(s)"
# 4. L'APK generato sarà disponibile in:
#    android/app/build/outputs/apk/debug/app-debug.apk
