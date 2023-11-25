let originalData; // Global variable to store the fetched data
let selectedLabels = []; // Array to keep track of selected labels

function createCheckboxes(datasets) {
    const container = document.getElementById('checkbox-container'); // Assuming you have a div with this ID
    container.innerHTML = ''; // Clear existing checkboxes (if any)

    datasets.forEach((dataset, index) => {
        // Create checkbox element
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'dataset' + index;
        checkbox.checked = true; // Initially checked
        checkbox.onchange = () => toggleDataset(dataset.label);

        // Create label element
        const label = document.createElement('label');
        label.htmlFor = 'dataset' + index;
        label.textContent = dataset.label;

        // Append to the container
        container.appendChild(checkbox);
        container.appendChild(label);

        // Add the label to the selectedLabels array
        selectedLabels.push(dataset.label);
    });
}

function toggleDataset(label) {
    const index = selectedLabels.indexOf(label);
    if (index > -1) {
        // Label is currently selected, remove it
        selectedLabels.splice(index, 1);
    } else {
        // Label is not selected, add it
        selectedLabels.push(label);
    }
    console.log(selectedLabels)
}

async function fetchDataAndCreateChart() {
    try {
        const response = await fetch('http://localhost:5000/get-data');
        const data = await response.json();

        // Store the fetched data in the global variable
        originalData = data;

        // Create the chart with the fetched data
        createChart(originalData);

        // Assuming 'originalData' is your data structure
        populateDateDropdowns(originalData.labels);

        createCheckboxes(originalData.datasets);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function filterDataByDateRange(data, start, finish) {
    // Find the index of the start date in the labels array, default to 0 if not specified
    const startIndex = start ? data.labels.indexOf(start) : 0;

    // Find the index of the finish date in the labels array, default to the last index if not specified
    const endIndex = finish ? data.labels.indexOf(finish) : data.labels.length - 1;

    // If start or end date is not found in the labels, use the full range for that end
    const startIdx = startIndex !== -1 ? startIndex : 0;
    const endIdx = endIndex !== -1 ? endIndex : data.labels.length - 1;

    // Filter the labels
    const filteredLabels = data.labels.slice(startIdx, endIdx + 1);

    // Filter each dataset's data
    const filteredDatasets = data.datasets.map(dataset => {
        return {
            ...dataset,
            data: dataset.data.slice(startIdx, endIdx + 1)
        };
    });

    return {
        labels: filteredLabels,
        datasets: filteredDatasets
    };
}

function filterDataByDatasetLabels(data, labelsToKeep) {
    // Filter datasets based on whether their label is in the labelsToKeep array

    console.log(labelsToKeep);

    const filteredDatasets = data.datasets.filter(dataset => labelsToKeep.includes(dataset.label));

    return {
        ...data,
        datasets: filteredDatasets
    };
}

function createChart(data) {

    console.log(data)
    const ctx = document.getElementById('myChart').getContext('2d');

    // Destroy the existing chart instance if it exists
    if (myChart) {
        myChart.destroy();
    }

    // Create a new chart instance
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: data.datasets
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createAndDisplayFilteredChart(originalData) {
    // Fetch the date range from the input fields
    const startIdx = document.getElementById('startDate').value;
    const endIdx = document.getElementById('endDate').value;

    // Apply the filters and create the chart
    const dataFilteredByDate = filterDataByDateRange(originalData, originalData.labels[startIdx], originalData.labels[endIdx]);
    console.log(dataFilteredByDate);
    const fullyFilteredData = filterDataByDatasetLabels(dataFilteredByDate, selectedLabels);

    createChart(fullyFilteredData);
}

function populateDateDropdowns(labels) {
    const startDateSelect = document.getElementById('startDate');
    const endDateSelect = document.getElementById('endDate');

    // Clear existing options
    startDateSelect.innerHTML = '';
    endDateSelect.innerHTML = '';

    // Add an option for each label
    labels.forEach((label, index) => {
        startDateSelect.options[startDateSelect.options.length] = new Option(label, index);
        endDateSelect.options[endDateSelect.options.length] = new Option(label, index);
    });

    // Optionally set the end date select to the last date by default
    endDateSelect.selectedIndex = labels.length - 1;
}

let myChart, columns, startDate, endDate; // Initialize

// Call the asynchronous function
// Since it's an async function, it will run without blocking the main thread
fetchDataAndCreateChart();

document.getElementById('submitBtn').addEventListener('click', () => {
    createAndDisplayFilteredChart(originalData);
});