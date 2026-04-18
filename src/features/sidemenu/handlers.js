/**
 * Sidemenu handlers — Menu latéral gauche (drawer).
 * Expose window.openSideMenu et window.closeSideMenu.
 * Chargé via <script src> dans index.html, utilisable par onclick inline.
 */

/**
 * Ouvre le menu latéral gauche avec une animation de glissement.
 * Affiche l'overlay sombre en arrière-plan pour bloquer le reste de l'interface.
 */
window.openSideMenu = function openSideMenu() {
    document.getElementById('side-menu-overlay').style.display = 'block';
    const btn = document.getElementById('menu-toggle-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
        document.getElementById('side-menu-overlay').style.opacity = '1';
        document.getElementById('side-menu').style.transform = 'translateX(0)';
    }, 10);
};

/**
 * Ferme le menu latéral avec animation. Masque l'overlay après la transition (300 ms).
 */
window.closeSideMenu = function closeSideMenu() {
    document.getElementById('side-menu').style.transform = 'translateX(-100%)';
    document.getElementById('side-menu-overlay').style.opacity = '0';
    const btn = document.getElementById('menu-toggle-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
        document.getElementById('side-menu-overlay').style.display = 'none';
    }, 300);
};
