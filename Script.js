function addAgeField() {
    const container = document.getElementById('agesContainer');
    const wrapper = document.createElement('div');
    wrapper.className = 'age-input-wrapper';
    wrapper.innerHTML = `
        <input type="number" class="age-input" value="25" min="0" max="120" required>
        <button type="button" class="remove-age" onclick="removeAge(this)">×</button>
    `;
    container.appendChild(wrapper);
}

function removeAge(button) {
    const ageInputs = document.querySelectorAll('.age-input');
    if (ageInputs.length > 1) {
        button.parentElement.remove();
    } else {
        showMessage('You must have at least one guest age', 'error');
    }
}

function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('messageArea');
    const className = type === 'error' ? 'error-message' : 'success-message';
    messageArea.innerHTML = `<div class="${className}">${message}</div>`;
    setTimeout(() => {
        messageArea.innerHTML = '';
    }, 5000);
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function convertToBackendFormat(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

document.getElementById('bookingForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const unitName = document.getElementById('unitName').value.trim();
    const arrival = document.getElementById('arrival').value;
    const departure = document.getElementById('departure').value;
    const occupants = parseInt(document.getElementById('occupants').value);

    if (!unitName || !arrival || !departure || !occupants) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }

    if (new Date(arrival) >= new Date(departure)) {
        showMessage('Departure date must be after arrival date', 'error');
        return;
    }

    const ageInputs = document.querySelectorAll('.age-input');
    const ages = Array.from(ageInputs).map(input => parseInt(input.value));

    if (ages.length !== occupants) {
        showMessage(`Please add ages for all ${occupants} guests`, 'error');
        return;
    }

    const payload = {
        "Unit Name": unitName,
        "Arrival": convertToBackendFormat(arrival),
        "Departure": convertToBackendFormat(departure),
        "Occupants": occupants,
        "Ages": ages
    };

    document.getElementById('resultsCard').classList.remove('hidden');
    document.getElementById('loading').classList.add('show');
    document.getElementById('resultsContainer').innerHTML = '';

    try {
        const response = await fetch('api/rates.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        document.getElementById('loading').classList.remove('show');

        if (data.success) {
            displayResults(data.data, unitName, arrival, departure);
            showMessage('✓ Rates retrieved successfully!', 'success');
        } else {
            document.getElementById('resultsContainer').innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${data.error}<br>
                    ${data.details ? `<small>${data.details}</small>` : ''}
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('loading').classList.remove('show');
        document.getElementById('resultsContainer').innerHTML = `
            <div class="error-message">
                <strong>Connection Error:</strong> ${error.message}<br>
                <small>Please check if the API is running.</small>
            </div>
        `;
    }
});

function displayResults(data, unitName, arrival, departure) {
    const container = document.getElementById('resultsContainer');
    const results = Array.isArray(data) ? data : [data];

    let html = '<div class="results-grid">';

    results.forEach(item => {
        html += `
            <div class="result-item">
                <h3>${unitName || 'Accommodation'}</h3>
                <div class="result-detail">
                    <span class="result-label">📅 Date Range:</span>
                    <span class="result-value">${formatDateDisplay(arrival)} - ${formatDateDisplay(departure)}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">💰 Rate:</span>
                    <span class="rate-value">${item.rate || item.Rate || 'N/A'}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">✓ Availability:</span>
                    <span class="result-value">${item.availability || item.Availability || 'Available'}</span>
                </div>
            </div>
        `;
    });

    if (results.length === 0 || !results[0].rate) {
        html = `
            <div class="result-item">
                <h3>${unitName}</h3>
                <div class="result-detail">
                    <span class="result-label">📅 Date Range:</span>
                    <span class="result-value">${formatDateDisplay(arrival)} - ${formatDateDisplay(departure)}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">Response:</span>
                    <span class="result-value">${JSON.stringify(data)}</span>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}