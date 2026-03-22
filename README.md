# 🚍 SmartTransport

Sistema de gestión de transporte empresarial con enfoque en **ciencia de datos**, diseñado para optimizar el uso de recursos mediante análisis de comportamiento y predicción de inasistencias.

---

## 📌 Descripción

SmartTransport permite a los empleados agendar transporte semanal y a los conductores registrar la asistencia real.  
Estos datos son almacenados en **Firebase Firestore** y utilizados para análisis y generación de insights.

El sistema transforma un proceso operativo en una **fuente de datos analítica**, permitiendo mejorar la toma de decisiones.

---

## 🎯 Problema

En muchas empresas, el transporte de empleados presenta:

- Inasistencias no notificadas  
- Cancelaciones de último momento  
- Mala planificación de rutas  
- Costos operativos innecesarios  

No existe un sistema que permita **analizar y predecir el comportamiento de los usuarios**.

---

## 🎯 Objetivo

Optimizar el uso del transporte empresarial mediante:

- Captura de datos en tiempo real  
- Análisis exploratorio  
- Modelos predictivos  
- Generación de insights  

---

## 🏗️ Arquitectura del proyecto
# Here are your Instructions


---

## 📊 Dataset

### Fuente
Datos generados por la aplicación (Firestore).

### Estructura principal

#### 📁 reservas
- nombre  
- telefono  
- direccion  
- zona  
- diasSemana  
- horarioEntrada  
- horarioSalida  
- tipoTransporte  
- estado  

#### 📁 eventos_asistencia
- reservaId  
- fecha  
- estadoAsistencia (asistio / no_asistio / cancelada)  
- timestamp  

---

## 🔄 Proceso de Ciencia de Datos

### ETL
- Extracción desde Firebase  
- Transformación a DataFrame  
- Integración de datos  

### Limpieza
- eliminación de nulos  
- normalización de datos  
- validación de consistencia  

### EDA
- análisis de inasistencias  
- comportamiento por zona  
- patrones por día  

---

## 🤖 Modelo

Se utilizó un modelo de clasificación:

- **Logistic Regression**

### Objetivo:
Predecir si un usuario asistirá o no.

### Variables:
- historial de faltas  
- frecuencia de uso  
- zona  
- cancelaciones previas  

---

## 📈 Resultados

- Identificación de usuarios de alto riesgo  
- Detección de zonas con baja demanda  
- Mejora en la toma de decisiones  

---

## 💡 Insights

- Existen zonas con baja utilización de transporte  
- Algunos usuarios presentan comportamiento recurrente de inasistencia  
- Se pueden optimizar rutas y reducir costos  

---

## 🚀 Valor del proyecto

- Digitalización del proceso  
- Datos en tiempo real  
- Análisis predictivo  
- Optimización operativa  

---

## ⚠️ Limitaciones

- Datos simulados o limitados  
- Modelo básico  
- Falta de variables externas  

---

## 🔮 Futuras mejoras

- Modelos avanzados (Random Forest, XGBoost)  
- Integración con GPS  
- Optimización de rutas en tiempo real  
- Sistema de alertas  

---

## 🛠️ Tecnologías utilizadas

- Firebase Firestore  
- React Native / Expo  
- Python  
- Pandas  
- Scikit-learn  

---
# SmartTransport

Sistema de gestión de transporte corporativo con enfoque en Ciencia de Datos, diseñado para digitalizar reservas, mejorar la calidad de los datos operativos y apoyar la toma de decisiones mediante analítica y procesos ETL automatizados.

## Descripción general

SmartTransport es una solución tecnológica compuesta por:

- una app móvil para empleados y conductores
- un panel administrativo web
- autenticación con Firebase Auth
- almacenamiento en Firestore
- un módulo ETL para importar, limpiar, validar y cargar datos históricos desde Excel

El proyecto busca generar valor agregado real al sistema mediante la integración de un componente de Ciencia de Datos aplicado a un problema operativo concreto: la gestión ineficiente del transporte corporativo.

## Problema

Antes de SmartTransport, la gestión del transporte se realizaba de forma manual mediante hojas de cálculo, mensajería y consolidación manual de reservas. Esto generaba:

- duplicidad de registros
- errores de captura
- baja trazabilidad
- uso ineficiente de la flota
- dificultad para analizar la operación
- poca capacidad para tomar decisiones basadas en datos

## Objetivo general

Aplicar conocimientos de Ciencia de Datos para integrar un componente de análisis y preparación de datos dentro de SmartTransport, generando valor agregado real en la operación del sistema.

## Objetivos específicos

- digitalizar la reserva y control de transporte
- estructurar los datos operativos en Firestore
- importar datos históricos desde Excel
- automatizar limpieza, validación y normalización de datos
- habilitar análisis e insights para la toma de decisiones
- mejorar la calidad y consistencia de la información del sistema

## Arquitectura del sistema

### Aplicación móvil
Desarrollada con React Native, Expo y TypeScript.

Funciones principales:
- inicio de sesión con Firebase Auth
- flujo por rol
- reserva de transporte para empleados
- registro de asistencia para conductores
- gestión de perfil de usuario

### Panel administrativo web
Desarrollado con React y TypeScript.

Funciones principales:
- gestión de usuarios y roles
- administración de datos operativos
- módulo ETL para carga de datos existentes desde Excel
- visualización y control del sistema

### Servicios y base de datos
- Firebase Auth
- Cloud Firestore

Colecciones principales:
- `users`
- `perfiles`
- `reservas`

## Dataset

### Fuentes de datos
- datos operativos generados por la app móvil y panel web
- datos históricos importados desde archivos Excel o CSV

### Estructura principal

#### `users`
Documento por `uid` con:
- `uid`
- `email`
- `rol`

#### `perfiles`
Documento por `uid` con:
- `uid`
- `nombre`
- `telefono`
- `direccion`
- `puntoReferencia`
- `zona`
- `perfilCompleto`

#### `reservas`
Documentos con:
- `uid`
- `nombre`
- `telefono`
- `direccion`
- `puntoReferencia`
- `zona`
- `diasSemana`
- `horarioEntrada`
- `horarioSalida`
- `tipoTransporte`
- `observaciones`
- `estado`
- `fechaCreacion`

## Proceso de Ciencia de Datos

### 1. Obtención
Los datos se obtienen desde:
- registros operativos del sistema
- archivos Excel con hojas `users`, `perfiles` y `reservas`

### 2. Limpieza y transformación
El módulo ETL realiza automáticamente:
- normalización de encabezados
- limpieza de strings
- normalización de roles
- normalización de zonas
- limpieza de teléfonos
- conversión de fechas y horas
- normalización de días de semana
- normalización de tipo de transporte
- deduplicación de registros
- validación de integridad por entidad

### 3. Carga
Los datos válidos se cargan en Firestore:
- `users/{uid}`
- `perfiles/{uid}`
- `reservas`

También se marcan con:
- `origen: "excel"`
- `synthetic: false`

### 4. Análisis exploratorio
A partir de los datos integrados es posible analizar:
- reservas por zona
- comportamiento por horario
- frecuencia de uso
- asistencia e inasistencia
- patrones operativos para toma de decisiones

## Componente ETL

El panel administrativo incluye un módulo de importación de datos existentes que permite:

- subir archivos `.xlsx`, `.xls` o `.csv`
- leer múltiples hojas
- validar estructura
- normalizar datos automáticamente
- detectar duplicados
- reportar errores por fila
- mostrar vista previa limpia
- importar únicamente registros válidos
- reemplazar datos sintéticos o agregar sobre datos existentes

Este componente representa el principal aporte de Ciencia de Datos del proyecto, al automatizar la preparación de datos para análisis y operación.

## Valor agregado

SmartTransport genera valor en los siguientes aspectos:

- mejora la calidad de los datos
- reduce errores manuales
- automatiza procesos de integración
- facilita análisis operativos
- mejora la toma de decisiones
- aumenta la trazabilidad del sistema
- permite escalar desde un proceso manual a uno digital y analizable

## Dashboard / demo funcional

La solución puede demostrarse mediante:
- app móvil
- panel web administrativo
- métricas y visualizaciones de datos operativos
- flujo ETL de importación y validación de datos

## Tecnologías utilizadas

### Frontend móvil
- React Native
- Expo
- TypeScript
- Expo Router

### Frontend web
- React
- TypeScript

### Backend / servicios
- Firebase Auth
- Cloud Firestore

### ETL y procesamiento
- TypeScript
- xlsx

## Estructura del repositorio

```bash
SmartTransport/
├── frontend/                 # App móvil Expo / React Native
├── AdminWeb/Frontend/        # Panel administrativo web
├── backend/                  # Servicios auxiliares
├── scripts/                  # Scripts de apoyo
└── README.md

## ▶️ Cómo ejecutar el proyecto
para correr la app
```bash
cd frontend
npm install
npx expo start

Para el Admin web  cd AdminWeb/frontend
npm run dev
