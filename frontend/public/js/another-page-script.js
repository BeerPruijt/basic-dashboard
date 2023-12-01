let myChart;
let currentMonthIndex = 0; // Index for the current month
const windowSize = 24; // Two-year window size in months
let data 

async function fetchDataAndCreateChart() {
    try {
        // Fetch the data from the API and convert it to a JSON
        // The structure is as follows: 
        // data
        // - labels
        // - datasets (in principle 3 values in this array)
        //   - label 
        //   - data

        const response = await fetch('http://localhost:5000/get-data-forecasts');
        data = await response.json();

        // Derive the true data from the dataset and make a deep copy such that we can update the shown data with slices without altering it
        originalLabels = JSON.parse(JSON.stringify(data.labels));
        originalTruelineData = JSON.parse(JSON.stringify(data.datasets[0].data)); // Create a deep copy

        // If datasets is [dataset0, dataset1, dataset2, ...], then datasets.slice(1) would result in a copy of [dataset1, dataset2, ...].
        originalForecastData = JSON.parse(JSON.stringify(data.datasets.slice(1))); 

        // Initiate the chart (still not completely clear to me what happens here but not the most important for now)
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
                animation: {
                    duration: 500, // Duration in milliseconds (1000 ms = 1 second)
                    easing: 'linear', // Easing function to use
                    onProgress: function(animation) {
                        // Optional: function called on each step of the animation
                    },
                    onComplete: function(animation) {
                        // Optional: function called when the animation is complete
                    }
                }
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
    console.log(originalForecastData);

    // Convert object keys (dates) to an array and sort them if necessary
    let dateKeys = Object.keys(originalForecastData[0].data).sort();

    // Ensure monthIndex is within the bounds of dateKeys
    if (monthIndex < 0 || monthIndex >= dateKeys.length) {
        console.error('Invalid monthIndex:', monthIndex);
        return [];
    }

    // Get the selected date key based on monthIndex
    let selectedDateKey = dateKeys[monthIndex+6];

    return originalForecastData.map(model => {
        let yourCustomLabels = originalLabels.slice(monthIndex+6, monthIndex + 18);

        let dataForSelectedMonth = model.data[selectedDateKey].map((value, index) => {
            return { x: yourCustomLabels[index], y: value };
        });

        return {
            label: model.label,
            data: dataForSelectedMonth,
            borderColor: model.borderColor,
            backgroundColor: model.backgroundColor,
            // ... other properties as needed
        };
    });
}


function updateChart() {
    // Update the labels for the chart
    myChart.data.labels = originalLabels.slice(currentMonthIndex, currentMonthIndex + windowSize);

    // Update the true line dataset
    const newTrueLineData = originalTruelineData.slice(currentMonthIndex, currentMonthIndex + windowSize);
    console.log('line')
    console.log(originalTruelineData);
    updateDatasetInPlace(myChart.data.datasets[0].data, newTrueLineData);

    // Update forecast datasets
    const newForecastDatasets = getForecastDatasets(currentMonthIndex);
    updateForecastDatasetsInPlace(myChart.data.datasets, newForecastDatasets);

    // Update y-axis options
    myChart.options.scales.y = {
        min: 0,
        max: 100,
        ticks: {
            stepSize: 20
        }
        // ... other y-axis options ...
    };

    // Update the chart
    myChart.update();
}

function updateDatasetInPlace(oldData, newData) {
    // Update each point in the existing dataset
    oldData.length = newData.length; // Ensure oldData has the same length as newData
    for (let i = 0; i < newData.length; i++) {
        oldData[i] = newData[i];
    }
}

function updateForecastDatasetsInPlace(oldDatasets, newForecastDatasets) {
    // Start updating from index 1, as index 0 is the true line dataset
    for (let i = 1; i < oldDatasets.length; i++) {
        if (i < newForecastDatasets.length + 1) {
            updateDatasetInPlace(oldDatasets[i].data, newForecastDatasets[i - 1].data);
        }
    }

    // Add any additional new forecast datasets
    for (let i = oldDatasets.length; i < newForecastDatasets.length + 1; i++) {
        oldDatasets.push(newForecastDatasets[i - 1]);
    }

    // Remove excess datasets
    if (newForecastDatasets.length + 1 < oldDatasets.length) {
        oldDatasets.length = newForecastDatasets.length + 1;
    }
}

