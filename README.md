# 🎵 Spotify Multidimensional Data Visualization

Aplicación web interactiva con **Flask + D3.js v7** que implementa las cuatro técnicas de visualización multidimensional del curso DS5343 sobre el dataset de Spotify.

**Curso:** DS5343 - Data Visualization
**Institución:** Universidad de Ingeniería y Tecnología (UTEC)
**Profesor:** Germain Garcia-Zanabria
**Autor:** Ricardo Amiel Acuña Villogas
**Dataset:** Kaggle Spotify — 170,653 tracks, 10 dimensiones de audio

---

## 📊 Visualizaciones implementadas

### 1. RadViz — Dimensional Anchoring

**Fórmula:**

$$p = \frac{\sum_{i=1}^{n} d_i \cdot a_i}{\sum_{i=1}^{n} d_i}$$

donde $d_i$ es el valor normalizado de la dimensión $i$ y $a_i$ es la posición del ancla.

La división por $\Sigma d_i$ (no por $N$) **garantiza matemáticamente que el punto siempre quede dentro del círculo** — propiedad clave de RadViz (equilibrio de fuerzas).

- **Dimensiones:** energy, danceability, popularity, acousticness, liveness, tempo (6)
- **Color:** popularidad (morado = baja → amarillo = alta)
- **Tarea:** ¿Cómo se agrupan las canciones según sus características de audio?

---

### 2. Star Coordinates — Vector Sum

**Fórmula:**

$$p = \sum_{i=1}^{n} d_i \cdot v_i$$

donde $v_i = (\cos\theta_i,\, \sin\theta_i) \times r_{max}$ es el vector del eje $i$.

A diferencia de RadViz, **no hay división normalizadora**: los puntos pueden salir del círculo de referencia. Los tracks con valores extremos se alejan proporcionalmente del centro.

- **Dimensiones:** energy, danceability, popularity, acousticness, liveness, tempo (6)
- **Grid:** 5 círculos concéntricos de referencia (20%, 40%, 60%, 80%, 100%)
- **Tarea:** ¿Qué features impulsan la popularidad?

---

### 3. Parallel Coordinates — Brushing & Filtering

**Normalización por eje:**

$$y_i = \frac{x_i - \min(x)}{\max(x) - \min(x)}$$

Cada track es una **línea poligonal** que conecta sus valores en los 10 ejes verticales. El brushing (click-drag) filtra en tiempo real.

- **Dimensiones:** las 10 features de audio simultáneamente
- **Interacción:** brush vertical en cualquier eje → líneas coincidentes se iluminan
- **Tarea:** ¿Qué correlaciones existen entre las 10 dimensiones?

---

### 4. PCA Projection — Dimensionality Reduction

Reducción **10D → 2D** via Principal Component Analysis calculado en el backend (scikit-learn). Pasos:

1. Centrar datos (restar medias)
2. Calcular matriz de covarianza $C = X^T X / (n-1)$
3. Eigendecomposición → seleccionar PC1 y PC2 (máxima varianza)
4. Proyectar: $y = X_{centrado} \cdot W$

- **PC1** (eje X): captura variación en energy + valence + danceability
- **PC2** (eje Y): captura variación en acousticness + instrumentalness
- **Tarea:** ¿Qué estructura subyacente revelan los datos en 2D?

---

## 🚀 Instalación y ejecución

### Prerrequisitos

```
Python 3.8+
```

### 1. Clonar / descomprimir el proyecto

```bash
# Asegurarse de que data.csv esté en la raíz junto a app.py
ls
# app.py  data.csv  templates/  requirements.txt  README.md
```

### 2. Crear entorno virtual e instalar dependencias

```bash
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

### 3. Ejecutar

```bash
python app.py
```

La primera ejecución tarda ~5 s mientras pre-computa todos los tamaños de muestra. Las siguientes peticiones son instantáneas.

### 4. Abrir en el navegador

```
http://localhost:5000
```

---

## 📁 Estructura del proyecto

```
.
├── app.py                  # Servidor Flask + pipeline de datos
├── data.csv                # Dataset Spotify (170 653 tracks)
├── requirements.txt        # Dependencias Python
├── README.md               # Este archivo
└── templates/
    └── index.html          # Dashboard D3.js v7 (integra las 4 visualizaciones hechas en observable)
```

---

## ⚙️ Arquitectura de rendimiento

El problema de lentitud se resolvió con una estrategia de **preload + caché**:

```
Startup (una sola vez, ~5 s):
  data.csv → normalización [0,1] → PCA × 6 variantes → JSON bytes en RAM

Cada request:
  dict lookup → devolver bytes pre-construidos
  Latencia: < 0.01 ms (sin cómputo por request)
```

| Variante n | Tracks | Tamaño JSON | Tiempo request |
|-----------|--------|-------------|----------------|
| 1,500     | 1,500  | ~578 KB     | < 0.01 ms      |
| 2,500     | 2,500  | ~964 KB     | < 0.01 ms      |
| 5,000     | 5,000  | ~1.9 MB     | < 0.01 ms      |
| 10,000    | 10,000 | ~3.8 MB     | < 0.01 ms      |
| 20,000    | 20,000 | ~7.5 MB     | < 0.01 ms      |
| all       | 170,653| ~64 MB      | < 0.01 ms      |

Herramientas de optimización usadas:
- **`orjson`** — serialización JSON 5-10× más rápida que `json` stdlib
- **`df.to_dict(orient='records')`** — 10× más rápido que `iterrows`
- **`MinMaxScaler` sobre todo el CSV una sola vez** — evita re-normalizar por request

---

## 🎮 Selector de tamaño de muestra

La URL acepta el parámetro `n` para elegir cuántos tracks visualizar:

| URL | Tracks |
|-----|--------|
| `http://localhost:5000/` | 2,500 (default) |
| `http://localhost:5000/?n=1500` | 1,500 |
| `http://localhost:5000/?n=5000` | 5,000 |
| `http://localhost:5000/?n=10000` | 10,000 |
| `http://localhost:5000/?n=20000` | 20,000 |
| `http://localhost:5000/?n=all` | 170,653 |

El header de la app incluye botones para cambiar entre tamaños sin editar la URL.

---

## 🖱️ Interactividad

| Visualización | Evento | Resultado |
|---|---|---|
| RadViz | `mouseenter` | Punto crece (r: 3.5→7), borde amarillo, tooltip |
| RadViz | `mousemove` | Tooltip sigue el cursor |
| RadViz | `mouseleave` | Punto vuelve al tamaño original |
| Star Coords | `mouseenter` | Igual que RadViz, muestra 6 features |
| Star Coords | `mouseleave` | Restaura punto |
| Parallel Coords | `brush` (drag) | Líneas coincidentes se iluminan (opacity 0.85), resto se desvanece (0.12) |
| Parallel Coords | `brushend` (release) | Resetea todas las líneas |
| PCA | `mouseenter` | Punto crece, muestra PC1, PC2, popularidad, año |
| PCA | `mouseleave` | Restaura punto |

---

## 📐 Features del dataset

| Feature | Rango original | Normalizado | Significado |
|---------|---------------|-------------|-------------|
| `valence` | [0, 1] | [0, 1] | Positividad musical |
| `energy` | [0, 1] | [0, 1] | Intensidad |
| `danceability` | [0, 1] | [0, 1] | Aptitud para bailar |
| `acousticness` | [0, 1] | [0, 1] | Presencia de instrumentos acústicos |
| `instrumentalness` | [0, 1] | [0, 1] | Ausencia de voz |
| `liveness` | [0, 1] | [0, 1] | Indicador de grabación en vivo |
| `loudness` | [−60, 3.85 dB] | [0, 1] | Nivel sonoro general |
| `popularity` | [0, 100] | [0, 1] | Popularidad en streaming |
| `tempo` | [0, 243.5 BPM] | [0, 1] | Velocidad |
| `speechiness` | [0, 1] | [0, 1] | Presencia de palabras habladas |

`loudness`, `tempo` y `popularity` se normalizan con `MinMaxScaler` sobre el dataset completo antes de muestrear.

---

## 🔬 Diferencia conceptual clave entre RadViz y Star Coordinates

| | RadViz | Star Coordinates |
|--|--------|-----------------|
| **Fórmula** | $\Sigma(d_i \cdot a_i) / \Sigma d_i$ | $\Sigma(d_i \cdot v_i)$ |
| **¿Divide?** | Sí, por $\Sigma d_i$ | No |
| **Puntos salen del círculo** | Nunca (garantía matemática) | Sí, si valores son altos |
| **Metáfora** | Equilibrio de fuerzas | Suma vectorial libre |
| **Propósito** | Clustering | Identificar drivers extremos |

---

## 📊 Insights del dataset

**RadViz:** Las canciones se separan claramente en dos regiones — tracks de alta energía/danceability hacia un lado y tracks acústicos/instrumentales hacia el opuesto. La popularidad (color) está distribuida en ambos grupos.

**Star Coordinates:** Los tracks populares (amarillos) tienden a alejarse del centro en la dirección de los ejes de danceability y energy. Los tracks muy acústicos forman una nube visible en la dirección opuesta.

**Parallel Coordinates:** Energy y loudness tienen líneas casi paralelas (correlación positiva fuerte). Acousticness y danceability se cruzan con frecuencia (correlación negativa). Tempo varía de forma independiente.

**PCA:** El eje PC1 separa tracks energéticos/bailables (derecha) de acústicos (izquierda). PC2 separa los instrumentales (arriba) de los vocales (abajo). Los clusters visibles corresponden aproximadamente a géneros musicales.

---

## 🛠 Stack tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Flask 2.3+ (Python) |
| Serialización JSON | orjson 3.9+ |
| Procesamiento de datos | pandas 1.5+, numpy 1.23+ |
| PCA | scikit-learn 1.2+ |
| Normalización | `MinMaxScaler` (scikit-learn) |
| Visualización | D3.js v7 |
| Estilos | CSS3 (grid, gradientes, backdrop-filter) |

---

## 🐛 Problemas comunes

**Puerto 5000 ocupado:**
```bash
python app.py  # cambia el puerto en la última línea: port=5001
```

**`orjson` no instalado:**
```bash
pip install orjson
```

**`data.csv` no encontrado:**
```
Asegúrate de que data.csv esté en el mismo directorio que app.py.
El archivo se busca en: os.path.join(os.path.dirname(__file__), 'data.csv')
```

**La app tarda mucho al arrancar:**
```
Normal — ~5 s la primera vez para pre-computar los 6 tamaños de muestra.
Después de ese startup, todas las peticiones son < 1 ms.
```

---

## 📬 Criterios de evaluación (20 pts)

| Criterio | Pts | Estado |
|----------|-----|--------|
| Claridad (labels, diseño) | 4 | ✅ |
| Insight analítico (patrones revelados) | 4 | ✅ |
| Justificación del diseño | 3 | ✅ |
| Precisión técnica (fórmulas correctas) | 3 | ✅ |
| Tareas analíticas (3 tasks) | 3 | ✅ |
| Interacción (hover, brush, click) | 3 | ✅ |

---

## 📚 Referencias

- D3.js v7 Documentation — https://d3js.org/
- Hoffman et al., *DNA Visual and Analytic Data Mining* (RadViz original)
- Kandogan, E. *Star Coordinates: A Multi-dimensional Visualization Technique* (2000)
- Inselberg, A. *Parallel Coordinates: Visual Multidimensional Geometry* (2009)
- scikit-learn PCA — https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.PCA.html
- Dataset: Kaggle Spotify Dataset 1921–2020 — https://www.kaggle.com/datasets/yamaerenay/spotify-dataset-19212020-600k-tracks
