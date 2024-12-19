document.addEventListener('DOMContentLoaded', function() {
    // CSRF Token generieren
    const generateCSRFToken = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };

    // CSRF Token setzen
    const csrfToken = generateCSRFToken();
    document.getElementById('csrf_token').value = csrfToken;
    // Token im Session Storage speichern
    sessionStorage.setItem('csrf_token', csrfToken);

    const form = document.getElementById('newsletterForm');
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');

    // Email-Validierung
    const isValidEmail = (email) => {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).toLowerCase());
    };

    // Name-Validierung
    const isValidName = (name) => {
        const re = /^[A-Za-zÄäÖöÜüß\s-]{0,50}$/;
        return name === '' || re.test(name);
    };

    // Formular absichern
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Grundlegende Validierung
        const email = form.email.value.trim();
        const name = form.name.value.trim();
        const honeypot = form.website.value;

        // Honeypot Check
        if (honeypot) {
            console.log('Spam detected');
            return;
        }

        // Validierung
        if (!isValidEmail(email)) {
            showMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }

        if (!isValidName(name)) {
            showMessage('Der Name enthält ungültige Zeichen.', 'error');
            return;
        }

        // Submission verhindern während des Sendens
        submitBtn.disabled = true;
        showMessage('Wird gesendet...', 'info');

        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    email,
                    name: name || undefined,
                    csrf_token: csrfToken
                })
            });

            if (!response.ok) {
                throw new Error('Netzwerkfehler');
            }

            const data = await response.json();
            
            if (data.success) {
                showMessage('Vielen Dank für Ihre Anmeldung! Bitte bestätigen Sie Ihre E-Mail-Adresse.', 'success');
                form.reset();
            } else {
                throw new Error(data.message || 'Ein Fehler ist aufgetreten');
            }
        } catch (error) {
            showMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', 'error');
            console.error('Submission error:', error);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Hilfsfunktion für Nachrichten
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
    }
}); 