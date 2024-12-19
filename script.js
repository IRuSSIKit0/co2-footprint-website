// Constants
const DEBOUNCE_DELAY = 300;
const DEFAULT_LOCALE = 'de-DE';

// Sample data
let emissionsDaten = [];

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
    const filteredData = emissionsDaten.filter(row =>
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
        
        const sortedData = sortData(emissionsDaten, column, currentSort.direction);
        renderTable(sortedData);
        
        // Update UI to show sort direction
        sortButtons.forEach(btn => btn.classList.remove('sort-asc', 'sort-desc'));
        button.classList.add(`sort-${currentSort.direction}`);
    });
});

// Export functionality
function exportToCsv() {
    const headers = ['Land', 'Unternehmen', 'CO2-Emissionen (t)'];
    const csvContent = [
        headers.join(';'),
        ...emissionsDaten.map(eintrag => 
            `${eintrag.land};${eintrag.unternehmen};${eintrag.emissionen}`
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'co2-emissionen.csv';
    link.click();
}

// Initialize
async function ladeDaten() {
    try {
        const response = await fetch('assets/daten.json');
        const data = await response.json();
        emissionsDaten = data.emissionen;
        renderTable(emissionsDaten);
        initiereSortierung();
    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        showError('Failed to load data');
    }
}

// Zeige die Daten in der Tabelle
function zeigeTabelle(daten) {
    const tbody = document.querySelector('#emissions-table tbody');
    tbody.innerHTML = '';

    if (daten.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="no-results">Keine Ergebnisse gefunden</td>
            </tr>`;
        return;
    }

    daten.forEach(eintrag => {
        const tr = document.createElement('tr');
        
        // Sichere Erstellung der Tabellenzellen
        const tdLand = document.createElement('td');
        tdLand.textContent = eintrag.land;
        
        const tdUnternehmen = document.createElement('td');
        tdUnternehmen.textContent = eintrag.unternehmen;
        
        const tdEmissionen = document.createElement('td');
        tdEmissionen.textContent = eintrag.emissionen.toLocaleString('de-DE');
        
        tr.appendChild(tdLand);
        tr.appendChild(tdUnternehmen);
        tr.appendChild(tdEmissionen);
        tbody.appendChild(tr);
    });
}

// Suche implementieren
function sucheDaten(suchbegriff) {
    const sichererSuchbegriff = validiereEingabe(suchbegriff).toLowerCase();
    const gefiltert = emissionsDaten.filter(eintrag => 
        eintrag.land.toLowerCase().includes(sichererSuchbegriff) ||
        eintrag.unternehmen.toLowerCase().includes(sichererSuchbegriff)
    );
    zeigeTabelle(gefiltert);
}

// Sortierung implementieren
function initiereSortierung() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const spalte = button.dataset.column;
            const istAufsteigend = !button.classList.contains('sort-asc');
            
            // Entferne bestehende Sortierklassen
            sortButtons.forEach(btn => {
                btn.classList.remove('sort-asc', 'sort-desc');
            });
            
            // Setze neue Sortierklasse
            button.classList.add(istAufsteigend ? 'sort-asc' : 'sort-desc');
            
            // Sortiere Daten
            const sortiert = [...emissionsDaten].sort((a, b) => {
                let vergleich = a[spalte] > b[spalte] ? 1 : -1;
                return istAufsteigend ? vergleich : -vergleich;
            });
            
            zeigeTabelle(sortiert);
        });
    });
}

// Event Listener
document.addEventListener('DOMContentLoaded', () => {
    ladeDaten();
    
    const suchfeld = document.getElementById('search');
    suchfeld.addEventListener('input', (e) => {
        sucheDaten(e.target.value);
    });
    
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        menuToggle.setAttribute('aria-expanded', 
            menuToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
        );
    });
});

// Fehlermeldung anzeigen
function zeigeFehlermeldung() {
    const tabelle = document.querySelector('.table-container');
    tabelle.innerHTML = `
        <div class="error-message">
            Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
        </div>`;
}

// Hilfsfunktion zum Escapen von HTML
function escapeHtml(unsichererText) {
    const div = document.createElement('div');
    div.textContent = unsichererText;
    return div.innerHTML;
}

// Validierung der Eingaben
function validiereEingabe(text) {
    // Entferne alle HTML-Tags und gefährliche Zeichen
    return text.replace(/<[^>]*>/g, '')
               .replace(/[&<>"']/g, function(match) {
                   const escape = {
                       '&': '&amp;',
                       '<': '&lt;',
                       '>': '&gt;',
                       '"': '&quot;',
                       "'": '&#39;'
                   };
                   return escape[match];
               });
}
  