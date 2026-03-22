#!/usr/bin/env python3
"""
Script para crear usuarios en Firebase
Ejecutar: python create_firebase_user.py
"""

import firebase_admin
from firebase_admin import credentials
from firebase_admin import auth
import os
import json

# Configuración de Firebase
FIREBASE_CONFIG = {
    "type": "service_account",
    "project_id": "transport-5fb0b",
    "private_key_id": "YOUR_KEY_ID",
    "private_key": "YOUR_PRIVATE_KEY",
    "client_email": "YOUR_CLIENT_EMAIL",
    "client_id": "YOUR_CLIENT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "YOUR_CERT_URL"
}

# Intenta cargar el archivo de credenciales
try:
    # Busca el archivo de credenciales en la raíz del proyecto
    if os.path.exists('../firebase-key.json'):
        cred = credentials.Certificate('../firebase-key.json')
    elif os.path.exists('./firebase-key.json'):
        cred = credentials.Certificate('./firebase-key.json')
    else:
        print("⚠️  No se encontró firebase-key.json")
        print("Necesitas:")
        print("1. Ir a Firebase Console → Project Settings → Service Accounts")
        print("2. Click 'Generate New Private Key'")
        print("3. Guardar el JSON como 'firebase-key.json' en la raíz del proyecto")
        exit(1)
    
    # Inicializa Firebase
    firebase_admin.initialize_app(cred)
    
    # Crea el usuario
    user = auth.create_user(
        email='admin@smarttransport.com',
        password='123456',
        display_name='Admin SmartTransport'
    )
    
    print(f"✅ Usuario creado exitosamente!")
    print(f"   UID: {user.uid}")
    print(f"   Email: {user.email}")
    print(f"   Nombre: {user.display_name}")
    print()
    print("🎉 Ahora puedes hacer login en la app con:")
    print("   Email: admin@smarttransport.com")
    print("   Contraseña: 123456")
    
except auth.EmailAlreadyExistsError:
    print("⚠️  El usuario ya existe en Firebase")
except Exception as e:
    print(f"❌ Error: {e}")
