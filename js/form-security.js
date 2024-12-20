// Formular-Sicherheits-Utilities
const FormSecurity = {
    // Reguläre Ausdrücke für Validierung
    patterns: {
        name: /^[a-zA-ZäöüßÄÖÜ\s-]{2,50}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[+\d\s()-]{8,20}$/,
        message: /^[\s\S]{10,1000}$/, // Mindestens 10, maximal 1000 Zeichen
        subject: /^[a-zA-Z0-9äöüßÄÖÜ\s-,.!?]{2,100}$/
    },

    // Eingabe säubern
    sanitizeInput(input) {
        return input
            .trim()
            .replace(/[<>]/g, '') // Entfernt < und >
            .replace(/javascript:/gi, '') // Entfernt javascript: Protocol
            .replace(/on\w+=/gi, '') // Entfernt onEvent Handler
            .replace(/data:/gi, ''); // Entfernt data: URLs
    },

    // Validiere einzelnes Feld
    validateField(value, type) {
        const pattern = this.patterns[type];
        if (!pattern) return false;
        return pattern.test(this.sanitizeInput(value));
    },

    // HTML-Entities escapen
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Formular-Daten validieren
    validateForm(formData) {
        const errors = [];
        
        for (const [key, value] of formData.entries()) {
            // Prüfe auf SQL-Injection Muster
            if (value.toLowerCase().includes('select') || 
                value.toLowerCase().includes('union') ||
                value.includes(';') ||
                value.includes('--') ||
                value.includes('/*')) {
                errors.push(`Ungültige Zeichen im Feld ${key}`);
                continue;
            }

            // Feldspezifische Validierung
            if (this.patterns[key] && !this.validateField(value, key)) {
                errors.push(`Ungültiges Format im Feld ${key}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

// Formular-Handler für alle Formulare
document.addEventListener('DOMContentLoaded', () => {
    // Kontaktformular
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const validation = FormSecurity.validateForm(formData);

            if (!validation.isValid) {
                alert('Fehler: ' + validation.errors.join('\n'));
                return;
            }

            // Sicheres Senden der Daten
            try {
                const response = await SecurityUtils.secureFetch('/api/contact', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    contactForm.reset();
                    alert('Nachricht wurde sicher übermittelt!');
                }
            } catch (error) {
                console.error('Fehler beim Senden:', error);
                alert('Fehler beim Senden der Nachricht');
            }
        });
    }

    // Newsletter-Formular
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(newsletterForm);
            const validation = FormSecurity.validateForm(formData);

            if (!validation.isValid) {
                alert('Fehler: ' + validation.errors.join('\n'));
                return;
            }

            try {
                const response = await SecurityUtils.secureFetch('/api/newsletter', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    newsletterForm.reset();
                    alert('Newsletter-Anmeldung erfolgreich!');
                }
            } catch (error) {
                console.error('Fehler bei der Newsletter-Anmeldung:', error);
                alert('Fehler bei der Newsletter-Anmeldung');
            }
        });
    }

    // Input Event-Listener für Echtzeit-Validierung
    document.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', (e) => {
            const field = e.target;
            const value = field.value;
            const type = field.name;

            // Sanitize während der Eingabe
            field.value = FormSecurity.sanitizeInput(value);

            // Validiere das Feld
            if (FormSecurity.patterns[type]) {
                const isValid = FormSecurity.validateField(value, type);
                field.classList.toggle('invalid', !isValid);
            }
        });
    });
});

// Verhindere Paste von formatiertem Text
document.addEventListener('paste', (e) => {
    if (e.target.matches('input, textarea')) {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const sanitizedText = FormSecurity.sanitizeInput(text);
        document.execCommand('insertText', false, sanitizedText);
    }
}); 