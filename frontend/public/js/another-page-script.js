let myChart, datesFromDatasets, minScale, maxScale;
let currentMonthIndex = 0; // Index for the current month
const windowSize = 24; // Two-year window size in months
let data 

// Assuming originalForecastData is an array of objects, 
// and each object has a 'data' property that is an object with date keys

function extractDatesFromDatasets(forecastData) {
    const allDates = forecastData.reduce((acc, dataset) => {
        // Get the dates from the current dataset
        const dates = Object.keys(dataset.data);

        // Add these dates to the accumulator, avoiding duplicates
        dates.forEach(date => {
            if (!acc.includes(date)) {
                acc.push(date);
            }
        });

        return acc;
    }, []);

    // Sort dates if necessary
    allDates.sort();

    return allDates;
}

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
        originalTruelineData = JSON.parse(JSON.stringify(data.true_line.data)); // Create a deep copy

        // Define min and max y values as the maximum and minimum of the true line and forecast datasets
        minScale = Math.min(...originalTruelineData);
        maxScale = Math.max(...originalTruelineData);

        // If datasets is [dataset0, dataset1, dataset2, ...], then datasets.slice(1) would result in a copy of [dataset1, dataset2, ...].
        originalForecastData = JSON.parse(JSON.stringify(data.datasets)); 
        datesFromDatasets = extractDatesFromDatasets(originalForecastData);

        // Initiate the chart (still not completely clear to me what happens here but not the most important for now)
        const ctx = document.getElementById('myChart').getContext('2d');
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: originalLabels.slice(currentMonthIndex, currentMonthIndex + windowSize),
                datasets: [
                    data.true_line, // True Line
                    ...getForecastDatasets(currentMonthIndex) // Forecast datasets
                ]
            },
            options: {
                scales: {
                    y: {
                        min: minScale,
                        max: maxScale
                    }
                },
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

document.getElementById('prevBtn').addEventListener('click', function () {
    if (currentMonthIndex > 0) {
        currentMonthIndex--;
        updateChart();
    }
    // Disable the button if currentMonthIndex is 0
    if (currentMonthIndex == 0) {
        document.getElementById('prevBtn').disabled = true;
    }
});

document.getElementById('nextBtn').addEventListener('click', function () {
    if (currentMonthIndex < originalLabels.length - windowSize) {
        currentMonthIndex++;
        updateChart();
    }
    // Enable the button if currentMonthIndex is greater than 0
    if (currentMonthIndex > 0) {
        document.getElementById('prevBtn').disabled = false;
    }
});

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

    // Get the selected date based on monthIndex
    let selectedDate = datesFromDatasets[monthIndex];

    // Derive the index of the selected date in the oiriginalLabels array
    let indexOfSelectedDate = originalLabels.indexOf(getFormattedDate(selectedDate));

    return originalForecastData.map(model => {

        // Derive the labels of the months corresponding to the forecasts
        let yourCustomLabels = originalLabels.slice(indexOfSelectedDate, indexOfSelectedDate + 12);

        // The forecasts are taken from the data based on the selectedDate and mapped to the labels, forecasts are stored in dict-like structure 'YYYY-MM-DD': [forecast1, forecast2, ...]
        let dataForSelectedMonth = model.data[selectedDate].map((value, index) => {
            return { x: yourCustomLabels[index], y: value };
        });

        // The formatted dataset is returned as a JSON that is accepted by Chart.js
        return {
            label: model.label,
            data: dataForSelectedMonth,
            borderColor: model.borderColor,
            backgroundColor: model.backgroundColor,
            // ... other properties as needed
        };
    });
}

// A function to format the date as YYYY-MM for the plot, raises error when the original format is not YYYY-MM-DD
function getFormattedDate(date) {
    let dateParts = date.split('-');
    if (dateParts.length !== 3) {
        console.error('Unexpected date format:', date);
    }
    console.log(dateParts[0] + '-' + dateParts[1])
    return dateParts[0] + '-' + dateParts[1];
}

function updateChart() {
    // Define the start of the window as max(currentMonthIndex-6, 0) 
    const startOfWindow = Math.max(currentMonthIndex - 6, 0);    

    // Update the labels for the chart
    myChart.data.labels = originalLabels.slice(startOfWindow, startOfWindow + windowSize);

    // Update the true line dataset (inplace)
    const newTrueLineData = originalTruelineData.slice(startOfWindow, startOfWindow + windowSize);
    updateDatasetInPlace(myChart.data.datasets[0].data, newTrueLineData);

    // Update forecast datasets (inplace)
    const newForecastDatasets = getForecastDatasets(currentMonthIndex);
    updateForecastDatasetsInPlace(myChart.data.datasets, newForecastDatasets);

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

