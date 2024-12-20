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
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(num) {
    return new Intl.NumberFormat('de-DE').format(num);
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
    const tableBody = document.querySelector("#emissions-table tbody");
    if (!tableBody) {
        console.error('Tabellen-Body nicht gefunden');
        return;
    }

    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        showNoResults();
        return;
    }
    
    data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(row.land)}</td>
            <td>${escapeHtml(row.unternehmen)}</td>
            <td data-value="${row.emissionen}">${formatNumber(row.emissionen)}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Sorting functionality
function sortData(data, column, direction) {
    return [...data].sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];
        
        // Numerische Sortierung für Emissionen und Jahr
        if (column === 'emissionen' || column === 'jahr') {
            valueA = Number(valueA);
            valueB = Number(valueB);
        }
            
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
        row.unternehmen.toLowerCase().includes(trimmedTerm) ||
        String(row.jahr).includes(trimmedTerm)
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
    document.querySelector('#emissions-table').before(errorDiv);
}

function showNoResults() {
    const tableBody = document.querySelector("#emissions-table tbody");
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="no-results">
                    Keine Ergebnisse gefunden
                </td>
            </tr>
        `;
    }
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
        const response = await fetch('daten.json');
        if (!response.ok) throw new Error('Netzwerkfehler');
        
        const data = await response.json();
        emissionsDaten = data.emissionen;
        
        renderTable(emissionsDaten);
        createEmissionsChart(emissionsDaten);
        calculateEnvironmentalImpact(emissionsDaten);
        
    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        showError('Fehler beim Laden der Daten');
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
    if (document.getElementById('emissions-table')) {
        ladeDaten();
    }
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

// Funktion zum Initialisieren der Filter
function initializeFilters(data) {
    console.log('Initialisiere Filter mit Daten:', data); // Debug-Log

    // Spalten definieren
    const filterConfig = [
        { id: 'landFilter', key: 'land' },
        { id: 'unternehmensFilter', key: 'unternehmen' },
        { id: 'jahrFilter', key: 'jahr' }
    ];

    filterConfig.forEach(({ id, key }) => {
        const filterElement = document.getElementById(id);
        if (!filterElement) {
            console.error(`Filter Element ${id} nicht gefunden`);
            return;
        }

        // Bestehende Optionen löschen
        filterElement.innerHTML = '<option value="">Alle</option>';

        // Unique Werte sammeln
        const uniqueValues = [...new Set(data.map(item => item[key]))].filter(Boolean);
        console.log(`Unique values for ${key}:`, uniqueValues); // Debug-Log

        // Werte sortieren
        uniqueValues.sort((a, b) => {
            if (key === 'jahr') return b - a;
            return String(a).localeCompare(String(b), 'de');
        });

        // Optionen hinzufügen
        uniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            filterElement.appendChild(option);
        });
    });

    // Event Listener für Filter
    document.querySelectorAll('.filter-select').forEach(filter => {
        filter.addEventListener('change', filterData);
    });
}

// Funktion zum Filtern der Daten
function filterData() {
    const filters = {
        land: document.getElementById('landFilter').value,
        unternehmen: document.getElementById('unternehmensFilter').value,
        jahr: document.getElementById('jahrFilter').value
    };

    console.log('Aktive Filter:', filters); // Debug-Log

    let filteredData = emissionsDaten;

    // Filter anwenden
    Object.entries(filters).forEach(([key, value]) => {
        if (value) {
            filteredData = filteredData.filter(item => String(item[key]) === String(value));
        }
    });

    console.log('Gefilterte Daten:', filteredData); // Debug-Log
    renderTable(filteredData);
}

// Beispiel für erweiterte Interaktivität
function addRowInteractions() {
    const rows = document.querySelectorAll('#emissions-table tbody tr');
    rows.forEach(row => {
        row.addEventListener('click', () => {
            showDetailView(row.dataset);
        });
        
        row.addEventListener('mouseenter', () => {
            row.classList.add('highlight');
        });
    });
}

// Virtualisierte Tabelle für große Datensätze
class VirtualizedTable {
    constructor(container, data) {
        this.pageSize = 50;
        this.currentPage = 0;
        this.data = data;
        this.container = container;
        
        this.init();
    }
    
    init() {
        this.renderVisibleRows();
        this.setupIntersectionObserver();
    }
}

// Chart.js Implementierung überarbeiten
async function createEmissionsChart(data) {
    const ctx = document.getElementById('emissionsChart').getContext('2d');
    
    // Sortiere die Daten nach Emissionen absteigend
    const sortedData = [...data].sort((a, b) => b.emissionen - a.emissionen);
    
    // Nimm nur die Top 10 für bessere Übersichtlichkeit
    const top10Data = sortedData.slice(0, 10);
    
    const chartData = {
        labels: top10Data.map(item => item.unternehmen),
        datasets: [{
            label: 'CO2-Emissionen (t)',
            data: top10Data.map(item => item.emissionen),
            backgroundColor: 'rgba(0, 77, 64, 0.7)',
            borderColor: 'rgba(0, 77, 64, 1)',
            borderWidth: 1
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Unternehmen nach CO2-Emissionen',
                    color: '#004d40',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'CO2-Emissionen (t)',
                        color: '#004d40'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Umweltauswirkungen berechnen
function calculateEnvironmentalImpact(data) {
    const totalEmissions = data.reduce((sum, item) => sum + item.emissionen, 0);
    const treesNeeded = Math.round(totalEmissions * 1000 / 12.5); // kg CO2 pro Baum pro Jahr
    
    document.getElementById('treeCalculation').innerHTML = `
        <p>Für die Kompensation der gesamten ${formatNumber(totalEmissions)} Tonnen CO2 
        würden <strong>${formatNumber(treesNeeded)} Bäume</strong> für ein Jahr benötigt.</p>
    `;

    document.getElementById('environmentalImpact').innerHTML = `
        <ul>
            <li>🌡️ Schmelzen von ${formatNumber(Math.round(totalEmissions * 3))} m³ Arktiseis</li>
            <li>🌍 ${formatNumber(Math.round(totalEmissions * 0.3))} m² Verlust an Permafrost</li>
            <li>🌊 Beitrag zur Erhöhung des Meeresspiegels um ${(totalEmissions * 0.000000001).toFixed(8)} mm</li>
        </ul>
    `;
}

// Newsletter-Formular-Validierung
document.getElementById('newsletterForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    // Validierung
    if (!validateEmail(data.email)) {
        showError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
        return;
    }
    
    // Newsletter-Anmeldung
    subscribeNewsletter(data);
});

async function subscribeNewsletter(data) {
    try {
        const response = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showSuccess('Vielen Dank für Ihre Anmeldung! Bitte bestätigen Sie diese über den Link in der E-Mail.');
            document.getElementById('newsletterForm').reset();
        } else {
            throw new Error('Fehler bei der Newsletter-Anmeldung');
        }
    } catch (error) {
        showError('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
    }
}

function showSuccess(message) {
    // Erfolgsanzeige implementieren
    alert(message); // Sollte durch eine bessere UI-Komponente ersetzt werden
}

// Google Maps Integration
function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 52.520008, lng: 13.404954 }, // Berlin
        zoom: 15
    });
    
    const marker = new google.maps.Marker({
        position: { lat: 52.520008, lng: 13.404954 },
        map: map,
        title: 'CO2-Footprint Transparenz e.V.'
    });
}
  