// Sicherheitsverbesserungen implementieren
const SecurityImprovements = {
    // SRI-Hashes generieren und setzen
    setSRIHashes() {
        const resources = document.querySelectorAll('script[src], link[rel="stylesheet"]');
        resources.forEach(async (resource) => {
            const response = await fetch(resource.src || resource.href);
            const text = await response.text();
            const hash = await this.generateSRIHash(text);
            resource.integrity = `sha384-${hash}`;
        });
    },

    // Subdomänen-Isolation
    enforceSubdomainIsolation() {
        if (window.location.hostname !== 'www.co2-transparenz.de') {
            window.location.hostname = 'www.co2-transparenz.de';
        }
    },

    // XSS-Schutz für Datenvisualisierung
    sanitizeDataDisplay(data) {
        return data.map(item => ({
            ...item,
            value: this.escapeHTML(String(item.value)),
            label: this.escapeHTML(String(item.label))
        }));
    },

    // Erweiterte Rate-Limiting-Implementierung
    setupRateLimiting() {
        const attempts = {};
        
        return (action) => {
            const now = Date.now();
            const key = `${action}_${now}`;
            
            if (!attempts[action]) {
                attempts[action] = [];
            }

            // Alte Versuche entfernen
            attempts[action] = attempts[action].filter(
                time => now - time < 3600000
            );

            if (attempts[action].length >= 10) {
                return false;
            }

            attempts[action].push(now);
            return true;
        };
    },

    // E-Mail-Domain-Validierung
    validateEmailDomain(email) {
        const [, domain] = email.split('@');
        return new Promise((resolve) => {
            dns.resolve(domain, 'MX', (err, addresses) => {
                resolve(!err && addresses && addresses.length > 0);
            });
        });
    },

    // Spam-Score-Berechnung
    calculateSpamScore(formData) {
        let score = 0;
        
        // Prüfe auf typische Spam-Muster
        if (formData.includes('http') || formData.includes('www')) score += 2;
        if (formData.toUpperCase() === formData) score += 1;
        if (formData.match(/(viagra|casino|crypto)/i)) score += 3;
        
        return score;
    },

    // Cookie-Consent-Management
    setupCookieConsent() {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            this.showCookieConsentBanner();
        }
    },

    // Tracking-Opt-Out
    enableTrackingOptOut() {
        window._optOut = () => {
            localStorage.setItem('tracking-opt-out', 'true');
            this.disableAllTracking();
        };
    }
};

// Implementierung für alle Seiten
document.addEventListener('DOMContentLoaded', () => {
    SecurityImprovements.setSRIHashes();
    SecurityImprovements.enforceSubdomainIsolation();
    SecurityImprovements.setupCookieConsent();
    SecurityImprovements.enableTrackingOptOut();
}); 