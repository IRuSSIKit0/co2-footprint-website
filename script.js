// Constants
const DEBOUNCE_DELAY = 300;
const DEFAULT_LOCALE = 'de-DE';

// Sample data
let data = [];

// DOM Elements
const tableBody = document.querySelector("tbody");
const searchInput = document.getElementById("search");
const sortButtons = document.querySelectorAll(".sort-btn");
const tableContainer = document.querySelector(".table-container");

// Validation
if (!tableBody || !searchInput || !tableContainer) {
    console.error("Required DOM elements not found");
    throw new Error("Required DOM elements not found");
}

// State management
let currentSort = {
    column: 'land',
    direction: 'asc'
};

// Utility functions
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(num) {
    return new Intl.NumberFormat(DEFAULT_LOCALE).format(num);
}

function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Table rendering
function renderTable(data) {
    tableContainer.classList.add('loading');
    
    try {
        tableBody.innerHTML = "";
        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${escapeHtml(row.land)}</td>
                <td>${escapeHtml(row.unternehmen)}</td>
                <td data-value="${row.emissionen}">${formatNumber(row.emissionen)}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error rendering table:', error);
        showError('Failed to render table data');
    } finally {
        tableContainer.classList.remove('loading');
    }
}

// Sorting functionality
function sortData(data, column, direction) {
    return [...data].sort((a, b) => {
        const valueA = a[column];
        const valueB = b[column];
        
        const comparison = typeof valueA === 'number' 
            ? valueA - valueB
            : String(valueA).localeCompare(String(valueB));
            
        return direction === 'asc' ? comparison : -comparison;
    });
}

// Search functionality
const handleSearch = debounce((searchTerm) => {
    const trimmedTerm = searchTerm.toLowerCase().trim();
    const filteredData = data.filter(row =>
        row.land.toLowerCase().includes(trimmedTerm) || 
        row.unternehmen.toLowerCase().includes(trimmedTerm)
    );
    
    if (filteredData.length === 0) {
        showNoResults();
    } else {
        const sortedData = sortData(filteredData, currentSort.column, currentSort.direction);
        renderTable(sortedData);
    }
}, DEBOUNCE_DELAY);

// UI feedback
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    tableContainer.insertAdjacentElement('beforebegin', errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

function showNoResults() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="3" class="no-results">
                Keine Ergebnisse gefunden
            </td>
        </tr>
    `;
}

// Event listeners
searchInput.addEventListener("input", (e) => {
    const value = e.target.value;
    if (value.length > 100) { // Prevent extremely long searches
        e.target.value = value.slice(0, 100);
    }
    handleSearch(e.target.value);
});

sortButtons.forEach(button => {
    button.addEventListener('click', () => {
        const column = button.dataset.column;
        currentSort.direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
        currentSort.column = column;
        
        const sortedData = sortData(data, column, currentSort.direction);
        renderTable(sortedData);
        
        // Update UI to show sort direction
        sortButtons.forEach(btn => btn.classList.remove('sort-asc', 'sort-desc'));
        button.classList.add(`sort-${currentSort.direction}`);
    });
});

// Export functionality
function exportToCsv() {
    const headers = ['Land', 'Unternehmen', 'Emissionen'];
    const csvContent = [
        headers.join(','),
        ...data.map(row => [
            row.land,
            row.unternehmen,
            row.emissionen
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'emissions_data.csv';
    link.click();
}

// Initialize
fetch('assets/data.json')
    .then(response => response.json())
    .then(jsonData => {
        data = jsonData; // Update global data
        renderTable(data);
    })
    .catch(error => {
        console.error('Error loading data:', error);
        showError('Failed to load data');
    });
  