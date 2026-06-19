// Mobile nav menu drawer - section: Gift-Banner | Left to right
(function(){
    function setupBanner(banner) {
        var burger = banner.querySelector('[data-menu-toggle]');
        var closeBtn = banner.querySelector('[data-menu-close]');
        var overlay = banner.querySelector('[data-menu-overlay]');
        if (!burger) return;

        function open(){
            banner.classList.add('is-menu-open');
            burger.setAttribute('aria-expanded', 'true');
        }

        function close(){
            banner.classList.remove('is-menu-open');
            burger.setAttribute('aria-expanded', 'false');
        }

        burger.addEventListener('click', open);

        if (closeBtn) {
            closeBtn.addEventListener('click', close);
        }
        if (overlay) {
            overlay.addEventListener('click', close);
        }
        document.addEventListener('keyup', function (event) {
            if (event.key === 'Escape') {
                close();
            }
        });
    }
    document.querySelectorAll('.gift-banner').forEach(setupBanner);
})();