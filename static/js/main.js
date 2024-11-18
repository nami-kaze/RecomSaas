function compileModel() {
    const sessionId = localStorage.getItem('sessionId');
    const systemType = document.getElementById('systemType').value;
    const selectedColumns = Array.from(document.getElementById('columnSelect').selectedOptions)
        .map(option => option.value);

    fetch('/compile-model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            system_type: systemType,
            columns: selectedColumns
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            document.getElementById('compileSuccess').style.display = 'block';
            
            // Generate input form
            generateInputForm(data.selected_columns);
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error compiling model');
    });
}

function generateInputForm(columns) {
    const container = document.getElementById('dynamicInputs');
    container.innerHTML = ''; // Clear existing inputs
    
    columns.forEach(column => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label for="${column}">${column}:</label>
            <input type="text" class="form-control" id="${column}" name="${column}" required>
        `;
        container.appendChild(div);
    });
    
    // Show the input form container
    document.getElementById('inputFormContainer').style.display = 'block';
}

// Add event listener for the recommendation form
document.getElementById('recommendationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const sessionId = localStorage.getItem('sessionId');
    const inputs = {};
    const form = e.target;
    
    // Collect all input values
    Array.from(form.elements).forEach(element => {
        if (element.type !== 'submit') {
            inputs[element.name] = element.value;
        }
    });
    
    // Send recommendation request
    fetch('/get-recommendations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            input_value: inputs,
            n_recommendations: 5
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayRecommendations(data.recommendations);
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error getting recommendations');
    });
});

function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendationsList');
    container.innerHTML = ''; // Clear existing recommendations
    
    // Convert recommendations object to array and display
    const items = Object.entries(recommendations).map(([key, value]) => {
        return `<div class="card mb-2">
            <div class="card-body">
                <h5 class="card-title">Recommendation ${key}</h5>
                <p class="card-text">${JSON.stringify(value, null, 2)}</p>
            </div>
        </div>`;
    }).join('');
    
    container.innerHTML = items;
    document.getElementById('recommendationsContainer').style.display = 'block';
}

// Make sure to add the onclick handler to your compile button in the HTML:
// <button onclick="compileModel()">Compile Model</button> 