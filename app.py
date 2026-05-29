from flask import Flask, render_template, jsonify
import json, os

app = Flask(__name__)
D = os.path.join(os.path.dirname(__file__), 'data')

def jload(f): return json.load(open(os.path.join(D, f)))

@app.route('/')
def index(): return render_template('index.html')

@app.route('/api/year')
def api_year(): return jsonify(jload('year.json'))

@app.route('/api/genres')
def api_genres(): return jsonify(jload('genres.json'))

@app.route('/api/artists')
def api_artists(): return jsonify(jload('artists.json'))

@app.route('/api/network')
def api_network(): return jsonify(jload('network.json'))

@app.route('/api/year_trends')
def api_year_trends(): return jsonify(jload('year_trends.json'))

@app.route('/api/treemap')
def api_treemap(): return jsonify(jload('treemap.json'))

@app.route('/api/pca_meta')
def api_pca_meta(): return jsonify(jload('pca_meta.json'))

if __name__ == '__main__':
    app.run(debug=True, port=5050)
