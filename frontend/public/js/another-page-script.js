let myChart;
let currentMonthIndex = 0; // Index for the current month
const windowSize = 24; // Two-year window size in months
let data 

async function fetchDataAndCreateChart() {
    try {
        const response = await fetch('http://localhost:5000/get-data-forecasts');
        data = await response.json();
        console.log(data);
        originalLabels = data.labels;
        originalForecastData = data.datasets.slice(1); // Assuming datasets[1] and datasets[2] are forecasts

        const ctx = document.getElementById('myChart').getContext('2d');
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: originalLabels.slice(currentMonthIndex, currentMonthIndex + windowSize),
                datasets: [
                    data.datasets[0], // True Line
                    ...getForecastDatasets(currentMonthIndex) // Forecast datasets
                ]
            },
            options: {
                // ... options ...
            }
        });

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    fetchDataAndCreateChart();

    document.getElementById('prevBtn').addEventListener('click', function () {
        if (currentMonthIndex > 0) {
            currentMonthIndex--;
            updateChart();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', function () {
        if (currentMonthIndex < originalLabels.length - windowSize) {
            currentMonthIndex++;
            updateChart();
        }
    });
});

function getForecastDatasets(monthIndex) {
    return originalForecastData.map(model => {
        return {
            label: model.label,
            data: model.data[monthIndex],
            borderColor: model.borderColor, // Define these in your original dataset
            backgroundColor: model.backgroundColor, // Define these in your original dataset
            // ... other properties as needed
        };
    });
}

function updateChart() {
    // Update the labels for the chart
    myChart.data.labels = originalLabels.slice(currentMonthIndex, currentMonthIndex + windowSize);

    // Update the true line dataset
    const trueLineData = data.datasets[0].data.slice(currentMonthIndex, currentMonthIndex + windowSize);

    // Update the datasets for the chart
    myChart.data.datasets = [
        {
            ...myChart.data.datasets[0], // Keep the properties of the True Line dataset
            data: trueLineData // Update the data for the True Line
        },
        ...getForecastDatasets(currentMonthIndex) // Update forecast datasets
    ];

    // Update the chart
    myChart.update();
}
