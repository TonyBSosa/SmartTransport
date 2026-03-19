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

## ▶️ Cómo ejecutar el proyecto

```bash
cd frontend
npm install
npx expo start
