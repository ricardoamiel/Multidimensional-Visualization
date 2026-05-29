# SoundScope — Spotify Multidimensional Explorer

## Setup
```bash
pip install -r requirements.txt
# Run data preprocessing (first time only):
python preprocess.py
# Start the app:
python app.py
```
Open http://localhost:5050

## Views
| Tab | Charts |
|-----|--------|
| Dashboard | Projection (PCA/t-SNE/UMAP) · Treemap · Parallel Coordinates · Correlation matrix |
| Multidimensional | RadViz · Star Coordinates |
| Temporal | Joyplot (100 years) · Explicit rate · Duration & Loudness war |
| Artists | Ego network · Top artists bar · Feature radar |

## Interaction
- **Global brush**: select genres in any chart → all views update
- **Projection**: brush · zoom · pan · color-by dropdown
- **RadViz**: drag anchors to reposition dimensional attractors
- **Star Coordinates**: drag axis ends to rotate · toggle features on/off
- **Parallel Coordinates**: brush any axis · drag labels to reorder axes
- **Artist search**: type to find artist → draws ego network + radar
- **Genre families**: click sidebar family → filters all linked views
- **Theme**: dark / light toggle in sidebar header

## Data Engineering
- `data_by_genres.csv` → filtered pop>35 (~2092 genres) → KMeans clusters, PCA, t-SNE, UMAP, MinMaxScaler normalization
- `data_by_year.csv` → enriched with explicit_rate from data.csv
- `data_w_genres.csv` → genre list parsed → primary_genre, ego network edges
- `data_by_artist.csv` → top 200 artists by popularity for network and bar chart
- `data.csv` → explicit rate aggregation by year only

## Analytical Tasks
- **T1 Clustering**: Which genres cluster together by audio features? (Projection + RadViz + Star)
- **T2 Evolution**: How did music change in 100 years? (Joyplot + Explicit + Duration)
- **T3 Correlation**: What makes a genre popular? (Parallel Coords + Correlation matrix)
