// Landing-only actions. Teaching data and role restrictions remain in app.js.
(() => {
  const dialog = document.querySelector('.home-dialog');
  if (!dialog) return;
  const content = {
    about: ['À propos de PhysiX', 'PhysiX est un projet éducatif de Physique-Chimie conçu par Abderrahim Ashad pour les lycéens marocains.\nCette version présente uniquement des données fictives. Les comptes sécurisés et les modules avancés ne sont pas encore activés.'],
    demo: ['Découvrir PhysiX', 'La demande de démonstration personnalisée n’est pas encore disponible : aucun formulaire ni service de contact n’est connecté.\nVous pouvez explorer dès maintenant la démonstration élève avec des données fictives.'],
    contact: ['Contact · bientôt disponible', 'Les coordonnées de contact ne sont pas encore configurées. Aucun message ne peut être envoyé depuis cette version.'],
    whatsapp: ['WhatsApp · non configuré', 'Le numéro professionnel sera ajouté par Abderrahim Ashad. Aucune conversation WhatsApp ne peut être ouverte pour le moment.'],
    legal: ['Mentions légales · en préparation', 'PhysiX — Projet éducatif d’Abderrahim Ashad.\nCette démonstration n’ouvre aucun compte réel et ne reçoit aucune donnée personnelle. Les interactions pédagogiques fictives sont conservées dans le stockage local de votre navigateur.\nLes informations légales complètes et les conditions d’utilisation seront publiées avant la mise en service.']
  };
  const demo = dialog.querySelector('.home-dialog-demo');
  document.querySelectorAll('[data-home-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.homeAction;
      document.getElementById('home-dialog-title').textContent = content[action][0];
      document.getElementById('home-dialog-text').textContent = content[action][1];
      demo.hidden = action !== 'demo';
      dialog.showModal();
    });
  });
  dialog.querySelector('.home-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
  demo.addEventListener('click', () => { dialog.close(); enterDemo('student'); });
})();
