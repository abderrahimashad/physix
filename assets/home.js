// Landing-only actions. Teaching data and role restrictions remain in app.js.
(() => {
  const dialog = document.querySelector('.home-dialog');
  if (!dialog) return;
  const content = {
    contact: ['Contact · bientôt disponible', 'Les coordonnées de contact ne sont pas encore configurées. Aucun message ne peut être envoyé depuis cette version.'],
    legal: ['Mentions légales · en préparation', 'PhysiX — Projet éducatif d’Abderrahim Ashad.\nCette démonstration n’ouvre aucun compte réel et ne reçoit aucune donnée personnelle. Les interactions pédagogiques fictives sont conservées dans le stockage local de votre navigateur.\nLes informations légales complètes et les conditions d’utilisation seront publiées avant la mise en service.']
  };
  document.querySelectorAll('[data-home-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.homeAction;
      if (action === 'whatsapp') {
        const message = encodeURIComponent('Bonjour, je vous contacte depuis PhysiX.');
        window.open(`https://wa.me/212665173058?text=${message}`, '_blank', 'noopener,noreferrer');
        return;
      }
      if (!content[action]) return;
      document.getElementById('home-dialog-title').textContent = content[action][0];
      document.getElementById('home-dialog-text').textContent = content[action][1];
      dialog.showModal();
    });
  });
  dialog.querySelector('.home-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
})();
