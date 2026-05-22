#!/usr/bin/env python3
"""
Flask application — Spotify Multidimensional Data Visualization
DS5343 - UTEC

Performance strategy:
  1. Read & normalize data.csv ONCE at startup (not per request)
  2. Pre-compute ALL n-variants (PCA + JSON bytes) at startup
  3. Serve pre-built JSON bytes directly — zero work per request
  4. orjson for 5-10x faster serialization vs stdlib json
"""

from flask import Flask, render_template, Response, request, jsonify
import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import MinMaxScaler
import orjson
import os, time

app = Flask(__name__)

FEATURES = ['valence', 'energy', 'danceability', 'acousticness',
            'instrumentalness', 'liveness', 'loudness', 'popularity',
            'tempo', 'speechiness']

KEEP_COLS = ['name', 'artists', 'year', 'pca1', 'pca2'] + FEATURES

VALID_N   = [1500, 2500, 5000, 10000, 20000, 'all']
CSV_PATH  = os.path.join(os.path.dirname(__file__), 'data.csv')

# ── Pre-built cache: { str(n): bytes }  ──────────────────────────────────────
_JSON_CACHE  = {}   # raw orjson bytes ready to serve
_ACTUAL_N    = {}   # int, actual track count per key
_DF_FULL     = None # normalized full dataframe (loaded once)


def load_and_normalize_csv():
    """Read data.csv and normalize ALL features once at startup."""
    global _DF_FULL
    t0 = time.time()
    print("📂  Loading data.csv …", flush=True)
    df = pd.read_csv(CSV_PATH)
    df[FEATURES] = df[FEATURES].fillna(0)
    scaler = MinMaxScaler()
    df[FEATURES] = scaler.fit_transform(df[FEATURES])
    _DF_FULL = df
    print(f"✅  CSV loaded & normalized in {time.time()-t0:.2f}s  ({len(df):,} rows)", flush=True)


def build_variant(n):
    """PCA + serialize one n-variant. Called once per n at startup."""
    global _DF_FULL
    t0 = time.time()
    key = str(n)

    total = len(_DF_FULL)
    if n == 'all' or n >= total:
        df = _DF_FULL.sample(frac=1, random_state=42).reset_index(drop=True)
        actual = total
    else:
        df = _DF_FULL.sample(n=n, random_state=42).reset_index(drop=True)
        actual = n

    # PCA
    X = df[FEATURES].values
    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(X)
    df = df.copy()
    df['pca1'] = X_pca[:, 0]
    df['pca2'] = X_pca[:, 1]

    # Clean metadata
    df['name']    = df['name'].fillna('Unknown').astype(str)
    df['artists'] = df['artists'].fillna('Unknown').astype(str)
    df['year']    = df['year'].fillna(2020).astype(int)

    # Serialize with orjson (10x faster than json.dumps)
    records = df[KEEP_COLS].to_dict(orient='records')
    payload = {'data': records, 'n': actual}
    json_bytes = orjson.dumps(payload)

    _JSON_CACHE[key]  = json_bytes
    _ACTUAL_N[key]    = actual

    print(f"   n={str(n):6s} → {actual:6,} tracks | "
          f"{len(json_bytes)//1024:4d} KB | {time.time()-t0:.2f}s", flush=True)


def preload_all():
    """Run at startup: load CSV once, build all n-variants."""
    load_and_normalize_csv()
    t0 = time.time()
    print("⚙️   Pre-computing all n-variants …", flush=True)
    for n in VALID_N:
        build_variant(n)
    print(f"🚀  All variants ready in {time.time()-t0:.2f}s — requests will be instant.\n", flush=True)


def resolve_n(raw):
    """Parse and validate the n query param."""
    try:
        n = int(raw) if raw != 'all' else 'all'
    except (ValueError, TypeError):
        n = 2500
    return n if n in VALID_N else 2500


# ── Run preload at import time (works with flask run and gunicorn) ────────────
preload_all()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    n       = resolve_n(request.args.get('n', '2500'))
    key     = str(n)
    actual  = _ACTUAL_N[key]
    return render_template('index.html', n=n, actual_n=actual, valid_n=VALID_N)


@app.route('/api/data')
def api_data():
    """Returns pre-built JSON bytes — zero computation per request."""
    n   = resolve_n(request.args.get('n', '2500'))
    key = str(n)
    return Response(
        _JSON_CACHE[key],
        mimetype='application/json',
        headers={'Cache-Control': 'public, max-age=3600'}
    )


@app.route('/api/stats')
def api_stats():
    n   = resolve_n(request.args.get('n', '2500'))
    key = str(n)
    # Decode just enough to compute stats (rarely called)
    payload = orjson.loads(_JSON_CACHE[key])
    df      = pd.DataFrame(payload['data'])
    stats   = {f: {'min':  float(df[f].min()),
                   'max':  float(df[f].max()),
                   'mean': float(df[f].mean()),
                   'std':  float(df[f].std())}
               for f in FEATURES}
    return Response(orjson.dumps(stats), mimetype='application/json')


if __name__ == '__main__':
    app.run(debug=False, port=5000)