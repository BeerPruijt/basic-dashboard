from flask import Flask, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)

@app.route('/get-data')
def get_data():
    # Generate date range
    date_range = pd.date_range(start='2020-01-01', end='2021-12-01', freq='MS')

    # Generate mock data for two price indices
    np.random.seed(0)  # For reproducibility
    price_index_1 = np.random.normal(loc=100, scale=10, size=len(date_range)).tolist()
    price_index_2 = np.random.normal(loc=200, scale=15, size=len(date_range)).tolist()

    # Prepare data for JSON response
    data = {
        "labels": [date.strftime("%Y-%m") for date in date_range],
        "datasets": [
            {
                "label": "Price Index 1",
                "data": price_index_1
            },
            {
                "label": "Price Index 2",
                "data": price_index_2
            }
        ]
    }
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
