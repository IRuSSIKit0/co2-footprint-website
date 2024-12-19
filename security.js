// Sicherheitskonfiguration
const SecurityConfig = {
    // Rate Limiting Einstellungen
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 Minuten Fenster
        maxAttempts: 5,
        blockDuration: 60 * 60 * 1000, // 1 Stunde Sperrzeit
    },

    // Token Einstellungen
    tokens: {
        csrfLength: 32,
        verificationLength: 64,
        expiration: 24 * 60 * 60 * 1000, // 24 Stunden
    },

    // Validierungsregeln
    validation: {
        email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        name: /^[A-Za-zÄäÖöÜüß\s-]{0,50}$/,
        maxLength: {
            email: 100,
            name: 50,
        }
    }
};

// Sicherheits-Utilities
class SecurityUtils {
    // CSRF Token Generator
    static generateToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Input Sanitization
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>]/g, '')
            .trim()
            .slice(0, SecurityConfig.validation.maxLength.email);
    }

    // XSS Prevention
    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Rate Limiter Implementation
class RateLimiter {
    constructor() {
        this.attempts = new Map();
        this.blocklist = new Map();
    }

    isBlocked(ip) {
        return this.blocklist.has(ip) && 
               (Date.now() - this.blocklist.get(ip)) < SecurityConfig.rateLimit.blockDuration;
    }

    attempt(ip) {
        if (this.isBlocked(ip)) {
            throw new Error('Zu viele Versuche. Bitte warten Sie.');
        }

        const now = Date.now();
        const userAttempts = this.attempts.get(ip) || { count: 0, timestamp: now };

        // Reset nach Zeitfenster
        if (now - userAttempts.timestamp > SecurityConfig.rateLimit.windowMs) {
            userAttempts.count = 0;
            userAttempts.timestamp = now;
        }

        userAttempts.count++;
        this.attempts.set(ip, userAttempts);

        if (userAttempts.count > SecurityConfig.rateLimit.maxAttempts) {
            this.blocklist.set(ip, now);
            throw new Error('Zu viele Versuche. Bitte warten Sie eine Stunde.');
        }
    }
}

// Form Validator
class FormValidator {
    static validateEmail(email) {
        const sanitizedEmail = SecurityUtils.sanitizeInput(email);
        if (!SecurityConfig.validation.email.test(sanitizedEmail)) {
            throw new Error('Ungültige E-Mail-Adresse');
        }
        return sanitizedEmail;
    }

    static validateName(name) {
        if (!name) return '';
        const sanitizedName = SecurityUtils.sanitizeInput(name);
        if (!SecurityConfig.validation.name.test(sanitizedName)) {
            throw new Error('Der Name enthält ungültige Zeichen');
        }
        return sanitizedName;
    }
}

// Newsletter Form Handler mit Sicherheitsmaßnahmen
class NewsletterFormHandler {
    constructor() {
        this.rateLimiter = new RateLimiter();
        this.form = document.getElementById('newsletterForm');
        this.setupFormSecurity();
    }

    setupFormSecurity() {
        // CSRF Token setzen
        const csrfToken = SecurityUtils.generateToken();
        document.getElementById('csrf_token').value = csrfToken;
        sessionStorage.setItem('csrf_token', csrfToken);

        // Event Listener mit Sicherheitsmaßnahmen
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await this.handleSubmit(e);
            } catch (error) {
                this.showError(error.message);
            }
        });
    }

    async handleSubmit(event) {
        // Rate Limiting Check
        this.rateLimiter.attempt('user-ip'); // In Produktion: echte IP verwenden

        // Formulardaten validieren
        const formData = new FormData(event.target);
        const email = FormValidator.validateEmail(formData.get('email'));
        const name = FormValidator.validateName(formData.get('name'));

        // Honeypot Check
        if (formData.get('website')) {
            throw new Error('Spam detected');
        }

        // CSRF Check
        const storedToken = sessionStorage.getItem('csrf_token');
        const formToken = formData.get('csrf_token');
        if (formToken !== storedToken) {
            throw new Error('Ungültiger Sicherheitstoken');
        }

        // Submission
        await this.submitForm({ email, name });
    }

    async submitForm(data) {
        const response = await fetch('/api/newsletter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': sessionStorage.getItem('csrf_token')
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Netzwerkfehler');
        }

        this.showSuccess('Vielen Dank für Ihre Anmeldung! Bitte bestätigen Sie Ihre E-Mail-Adresse.');
    }

    showError(message) {
        const messageElement = document.getElementById('formMessage');
        messageElement.textContent = message;
        messageElement.className = 'form-message error';
    }

    showSuccess(message) {
        const messageElement = document.getElementById('formMessage');
        messageElement.textContent = message;
        messageElement.className = 'form-message success';
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('newsletterForm')) {
        new NewsletterFormHandler();
    }
}); 