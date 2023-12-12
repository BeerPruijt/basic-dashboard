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

@app.route('/get-data-forecasts')
def get_data_forecasts():
    # Generate date range from 2010 to 2026
    date_range = pd.date_range(start='2010-01-01', end='2026-12-01', freq='MS')

    # Generate true line data
    np.random.seed(0)  # For reproducibility
    true_line = [i for i in range(len(date_range))] #np.random.normal(loc=100, scale=10, size=len(date_range)).tolist()

    # Function to generate forecasts starting from a given value
    def generate_forecasts(start_value, coef):
        forecasts = [start_value]
        for _ in range(12):  # 12 forecasts for each month
                next_value = forecasts[-1] * coef + np.random.normal(scale=5)  # AR(1) with some noise
                forecasts.append(next_value)
        return forecasts

    # Generate forecast data for each model
    model1_forecasts = {date_range[idx].strftime('%Y-%m-%d'): generate_forecasts(value, 1.05) for idx, value in enumerate(true_line)}
    model2_forecasts = {date_range[idx].strftime('%Y-%m-%d'): generate_forecasts(value, 0.95) for idx, value in enumerate(true_line)}

    # Prepare data for JSON response
    data = {
        "labels": [date.strftime("%Y-%m") for date in date_range],
        "true_line": {"data": true_line, "label": "True Line"},
        "datasets": [
            {
                "label": "Model1",
                "data": model1_forecasts
            },
            {
                "label": "Model2",
                "data": model2_forecasts
            }
        ]
    }

    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
