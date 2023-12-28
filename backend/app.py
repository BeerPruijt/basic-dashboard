from flask import Flask, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

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

def format_forecast_data(true_line, dates, forecasts_dict, true_line_name):

    # Get the first month from the forecast data
    first_month = list(list(forecasts_dict.values())[0].keys())[0]

    # Truncate the true line data to the first month, same for the dates
    true_line = true_line[dates.index(first_month):]
    dates = dates[dates.index(first_month):]
    labels = [i.strftime("%Y-%m") for i in dates]

    # Prepare the JSON-like structure
    data = {
        "labels": labels,
        "true_line": {
            "data": true_line,
            "label": true_line_name
        },
        "datasets": []
    }

    # Append forecast data for each model
    for model_label, model_data in forecasts_dict.items():
        if not isinstance(model_data, dict):
            raise ValueError(f"Data for model '{model_label}' must be a dictionary")
        
        # Format the dates in the forecast data
        model_data = {i.strftime("%Y-%m-%d"): [true_line[labels.index(i.strftime("%Y-%m"))]] + j for i, j in model_data.items()}

        data["datasets"].append({
            "label": model_label,
            "data": model_data
        })

    return data

def generate_rw_forecasts(data, n_months, lags=1):
    """
    Generate Random Walk forecasts for a time series.

    Parameters:
    data (pd.Series): The time series data.
    n_months (int): Number of months to forecast.
    lags (int): Number of past observations to consider for the last value.

    Returns:
    pd.Series: Random Walk forecasts.
    """
    # Validate lags
    if lags < 1:
        raise ValueError("Lags should be at least 1.")
    
    # Ensure data has enough points
    if len(data) < lags:
        raise ValueError("Data length must be greater than or equal to the number of lags.")

    # Calculate the last observed value based on the specified lags
    last_observed_value = data.iloc[-lags:].mean().item()

    # Generate random walk forecasts
    rw_forecasts = pd.Series([last_observed_value] * n_months, 
                             index=pd.date_range(start=data.index[-1], 
                                                 periods=n_months + 1, 
                                                 freq='MS')[1:])
    return rw_forecasts

def generate_arima_forecasts(data, n_months, order=(1, 0, 0)):
    """
    Fit an ARIMA model to the time series data and generate recursive forecasts.

    Parameters:
    data (pd.Series): The time series data.
    n_months (int): Number of months to forecast.
    order (tuple): The order of the ARIMA model (p, d, q).

    Returns:
    pd.Series: ARIMA model recursive forecasts.
    """
    # Ensure data is in the correct frequency
    data = data.asfreq('MS')

    # Initialize and fit the ARIMA model
    model = ARIMA(data, order=order)
    fitted_model = model.fit()

    # Generate forecasts
    forecasts = fitted_model.forecast(steps=n_months)

    return forecasts

def generate_forecasts(data, model_dict, forecast_months, n_steps):
    forecasts = {}

    for model_name, model in model_dict.items():
        model_forecasts = {}
        for month in forecast_months:
            if month < (data.index[-1]-pd.DateOffset(months=n_steps-1)):
                # Slice the data up to the forecast month
                data_to_month = data[:month]

                # Generate forecasts using the model
                forecast = model(data_to_month, n_steps)

                # Store the forecasts with the corresponding date
                model_forecasts[month] = forecast.tolist()

        forecasts[model_name] = model_forecasts

    return forecasts

def read_data(file_path):
    # Read the data from a text file
    data = pd.read_csv(file_path, sep='\t', parse_dates=['date'], index_col='date')
    return data

@app.route('/get-data-forecasts')
def get_data_forecasts_old():
    file_path = r"C:\Users\beerp\Data\cpi_as_txt\all_items_less_energy.txt"  # Replace with your file path

    # Read the data
    data = read_data(file_path)

    true_line = list(data.values.ravel())
    true_line_name = "all_items_less_energy"
    dates = list(data.index)

    model_dict = {
        "AR_Model": generate_arima_forecasts,
        "RW_Model": generate_rw_forecasts
    }

    # Define a data range for the forecasts
    forecast_months = pd.date_range(start=pd.to_datetime('2013-03-01'), periods=96, freq='MS')
    n_steps = 12

    forecasts = generate_forecasts(data, model_dict, forecast_months, n_steps)

    formatted_data = format_forecast_data(true_line, dates, forecasts, true_line_name)

    return jsonify(formatted_data)

@app.route('/get-data-forecasts-old')
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
