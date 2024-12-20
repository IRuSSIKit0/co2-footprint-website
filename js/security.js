// Sicherheits-Konfiguration
const SecurityConfig = {
    // CSRF-Token aus Meta-Tag
    csrfToken: document.querySelector('meta[name="csrf-token"]')?.content,
    
    // Basis-URL für API-Anfragen
    apiBaseUrl: 'https://api.co2-transparenz.de',
    
    // Erlaubte Domains für externe Links
    allowedDomains: [
        'co2-transparenz.de',
        'maps.googleapis.com'
    ]
};

// Sicherheits-Utilities
const SecurityUtils = {
    // XSS-Schutz: Text escapen
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // CSRF-Token zu Requests hinzufügen
    addCSRFToken(headers = {}) {
        if (SecurityConfig.csrfToken) {
            headers['X-CSRF-Token'] = SecurityConfig.csrfToken;
        }
        return headers;
    },

    // Externe Links überprüfen
    validateExternalLink(url) {
        try {
            const urlObj = new URL(url);
            return SecurityConfig.allowedDomains.includes(urlObj.hostname);
        } catch {
            return false;
        }
    },

    // Sichere Fetch-Wrapper
    async secureFetch(url, options = {}) {
        // Basis-Sicherheitsoptionen
        const secureOptions = {
            ...options,
            credentials: 'same-origin',
            headers: this.addCSRFToken(options.headers || {})
        };

        try {
            const response = await fetch(url, secureOptions);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },

    // Input-Validierung
    validateInput(input, pattern) {
        if (pattern instanceof RegExp) {
            return pattern.test(input);
        }
        return false;
    },

    // Sichere DOM-Manipulation
    safeInnerHTML(element, content) {
        if (element && typeof content === 'string') {
            element.textContent = content;
        }
    }
};

// Event-Listener für externe Links
document.addEventListener('DOMContentLoaded', () => {
    // Externe Links sichern
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        if (!SecurityUtils.validateExternalLink(link.href)) {
            link.setAttribute('rel', 'noopener noreferrer');
            link.setAttribute('target', '_blank');
        }
    });

    // Formular-Validierung
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!SecurityConfig.csrfToken) {
                e.preventDefault();
                console.error('CSRF-Token fehlt!');
            }
        });
    });
});

// Globale Error-Handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Hier könnte ein Error-Tracking-System eingebunden werden
    event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Content-Security-Policy Violation Handler
document.addEventListener('securitypolicyviolation', (e) => {
    console.error('CSP violation:', {
        violatedDirective: e.violatedDirective,
        blockedURI: e.blockedURI
    });
}); 