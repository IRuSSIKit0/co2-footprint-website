class Analytics {
  constructor() {
    this.events = [];
    this.initializeConsent();
  }

  initializeConsent() {
    const consent = localStorage.getItem('analytics-consent');
    if (!consent) {
      this.showConsentBanner();
    }
  }

  showConsentBanner() {
    const banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.innerHTML = `
      <p>Wir nutzen anonymisierte Analysen zur Verbesserung unserer Website. 
         Sind Sie damit einverstanden?</p>
      <button class="accept">Akzeptieren</button>
      <button class="decline">Ablehnen</button>
    `;
    document.body.appendChild(banner);

    banner.querySelector('.accept').addEventListener('click', () => {
      localStorage.setItem('analytics-consent', 'true');
      this.initializeTracking();
      banner.remove();
    });

    banner.querySelector('.decline').addEventListener('click', () => {
      localStorage.setItem('analytics-consent', 'false');
      banner.remove();
    });
  }

  trackEvent(category, action, label) {
    if (localStorage.getItem('analytics-consent') === 'true') {
      const event = {
        category,
        action,
        label,
        timestamp: new Date().toISOString()
      };
      this.events.push(event);
      this.sendToServer(event);
    }
  }

  sendToServer(event) {
    // Implementieren Sie hier Ihre Server-Kommunikation
    console.log('Analytics event:', event);
  }
}

class EmissionsAnalytics {
  trackTableInteraction(action, details) {
    // Anonymisiertes Tracking
    const event = {
      category: 'table_interaction',
      action: action,
      timestamp: new Date().toISOString()
    };
    this.sendToAnalytics(event);
  }
} 