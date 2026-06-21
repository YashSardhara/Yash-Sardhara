import { CartLinesUpdateEvent } from '@shopify/events';

class GiftGrid extends HTMLElement {
    connectedCallback() {
        this.softWinterJacketId = parseInt(this.dataset.swjId, 10) || null;

        this.products = {};
        try {
            JSON.parse(this.querySelector('[data-gift-products]').textContent)
                .forEach((p) => { this.products[p.index] = p; });
        } catch (err) {
            console.error('[gift-grid] bad product data:', err);
        }

        this.overlay = this.querySelector('[data-popup-overlay]');
        this.closeBtn = this.querySelector('[data-popup-close]');
        this.imageEl = this.querySelector('[data-popup-image]');
        this.titleEl = this.querySelector('[data-popup-title]');
        this.priceEl = this.querySelector('[data-popup-price]');
        this.descEl = this.querySelector('[data-popup-description]');
        this.optionsEl = this.querySelector('[data-popup-options]');
        this.forms = Array.from(this.querySelectorAll('[data-popup-form]'));

        this.product = null;
        this.form = null;
        this.selected = {};

        this.bindEvents();
    }

    bindEvents() {
        this.querySelectorAll('[data-hotspot]').forEach((btn) => {
            btn.addEventListener('click', () => this.open(Number(btn.dataset.index)));
        });
        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.classList.contains('is-open')) this.close();
        });

        this.forms.forEach((form) => {
            const btn = form.querySelector('[ref="addToCartButton"]');
            btn?.addEventListener('click', (e) => {
                if (btn.disabled) return;
                if (this.jacketMatch()) {
                    // Black + Medium selected -> add ONLY the Soft Winter Jacket
                    // (suppress the native add) then open the cart drawer after completion of the cart event.
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.addJacket();
                    setTimeout(() => { this.close(); this.openCart(); }, 600);
                } else {
                    // Normal add: let the native form add the selection, then open the cart.
                    setTimeout(() => {
                        this.close();
                        this.openCart();
                    }, 2500);
                }
            }, true);
        });
    }

    open(index) {
        const product = this.products[index];
        if (!product) return;

        this.product = product;
        this.selected = {};
        this.form = this.forms.find((f) => f.dataset.formIndex === String(index)) || null;
        this.forms.forEach((f) => { f.hidden = f !== this.form; });

        this.imageEl.src = product.image || '';
        this.imageEl.alt = product.title || '';
        this.titleEl.textContent = product.title || '';
        this.descEl.textContent = product.description || '';
        this.renderOptions(product);
        this.updateVariant();

        this.classList.add('is-open');
        document.body.classList.add('gift-no-scroll');
        this.closeBtn.focus();
    }

    close() {
        this.classList.remove('is-open');
        document.body.classList.remove('gift-no-scroll');
        this.product = null;
    }

    // click event for opening cart drawer after add-to-cart (for All variants)
    // since we are not showing the header we are auto opening the cart drawer to show the user their updated cart with the gift item added
    openCart() {
        /** @type {HTMLElement|null} */ (document.querySelector('[data-testid="cart-drawer-trigger"]'))?.click();
    }

    renderOptions(product) {
        this.optionsEl.innerHTML = '';
        const options = product.options || [];
        const variants = product.variants || [];

        this.defaultOnly = variants.length <= 1 && (!options.length || /^title$/i.test(options[0]));
        if (this.defaultOnly) return;

        options
            .map((name, i) => ({ name, i }))
            .sort((a, b) => (/size/i.test(a.name) ? 1 : 0) - (/size/i.test(b.name) ? 1 : 0))
            .forEach(({ name, i }) => {
                const values = [...new Set(variants.map((v) => v.options[i]))];
                const group = document.createElement('div');
                group.className = 'gift-popup__option';
                group.innerHTML = `<span class="gift-popup__option-label">${name}</span>`;
                group.appendChild(/size/i.test(name) ? this.buildSelect(name, values) : this.buildSwatches(name, values));
                this.optionsEl.appendChild(group);
            });
    }

    buildSelect(name, values) {
        const select = document.createElement('select');
        select.className = 'gift-popup__select';
        select.innerHTML =
            `<option value="" disabled selected>Choose your size</option>` +
            values.map((v) => `<option value="${v}">${v}</option>`).join('');
        select.addEventListener('change', () => {
            this.selected[name] = select.value;
            this.updateVariant();
        });
        return select;
    }

    buildSwatches(name, values) {
        const group = document.createElement('div');
        group.className = 'gift-swatch-group';
        group.style.setProperty('--count', values.length);
        group.innerHTML = '<span class="gift-swatch-indicator"></span>';

        const cells = values.map((val, idx) => {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'gift-swatch';
            cell.innerHTML =
                `<span class="gift-swatch__bar" style="background:${this.colorFor(val)}"></span>` +
                `<span class="gift-swatch__label">${val}</span>`;
            cell.addEventListener('click', () => select(idx));
            group.appendChild(cell);
            return cell;
        });

        const select = (idx) => {
            group.style.setProperty('--sel', idx);
            group.classList.add('has-selection');
            cells.forEach((c, i) => c.classList.toggle('is-active', i === idx));
            this.selected[name] = values[idx];
            this.updateVariant();
        };

        select(0);
        return group;
    }

    // predefined color name to hex map, plus passthrough for any other value (like hex or rgb)
    colorFor(value) {
        const map = {
            red: '#b20f36', grey: '#afafb7', gray: '#afafb7', blue: '#0d499f',
            black: '#111111', white: '#ffffff', green: '#1a7f37', navy: '#1b2a5b',
            beige: '#d8cdbb', brown: '#6b4423', pink: '#e25aa0', yellow: '#f5df00',
            orange: '#e8772e', purple: '#7c3aed',
        };
        const key = String(value).trim().toLowerCase();
        return map[key] || key;
    }

    matchedVariant() {
        const p = this.product;
        if (!p?.variants?.length) return null;
        if (this.defaultOnly) return p.variants[0];
        return p.variants.find((v) => p.options.every((name, i) => this.selected[name] === v.options[i])) || null;
    }


    updateVariant() {
        const variant = this.matchedVariant();
        this.priceEl.textContent = this.money(variant ? variant.price : this.product.price);
        if (!this.form) return;
        const input = this.form.querySelector('input[name="id"]');
        const btn = this.form.querySelector('[ref="addToCartButton"]');
        const ready = Boolean(variant && variant.available);
        if (ready) input.value = variant.id;
        btn.disabled = !ready;
    }


    jacketMatch() {
        const variant = this.matchedVariant();
        if (!variant || !this.softWinterJacketId) return false;
        const opts = variant.options.map((o) => String(o).trim().toLowerCase());
        const hasBlack = opts.includes('black');
        const hasMedium = opts.includes('m') || opts.includes('medium');
        return hasBlack && hasMedium;
    }

    addJacket() {
        if (!this.softWinterJacketId) return;

        // Ask Shopify to return the cart-items section HTML so the drawer can
        // re-render live (same mechanism the native product form uses).
        /** @type {string[]} */
        const sectionIds = [];
        document.querySelectorAll('cart-items-component').forEach((el) => {
            if (el instanceof HTMLElement && el.dataset.sectionId) sectionIds.push(el.dataset.sectionId);
        });

        /** @type {{ items: Array<{ id: number, quantity: number }>, sections?: string }} */
        const body = { items: [{ id: this.softWinterJacketId, quantity: 1 }] };
        if (sectionIds.length) body.sections = sectionIds.join(',');

        const deferred = CartLinesUpdateEvent.createPromise();
        document.body.dispatchEvent(
            new CartLinesUpdateEvent({
                action: 'add',
                context: 'product',
                lines: [{ merchandiseId: String(this.softWinterJacketId), quantity: 1 }],
                promise: deferred.promise,
            })
        );

        fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body),
        })
            .then((r) => r.json())
            .then((added) =>
                fetch('/cart.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
                    .then((r) => r.json())
                    .then((cart) => {
                        deferred.resolve({
                            cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
                            detail: {
                                items: cart.items,
                                source: 'gift-grid',
                                itemCount: 1,
                                sections: added.sections,
                                didError: false,
                            },
                        });
                        this.openCart();
                    })
            )
            .catch(deferred.reject);
    }


    money(cents) {
        // removing this.dataset.locale since we have to show in Euro and the locale is showing in dollar
        try {
            return new Intl.NumberFormat( 'de-DE', {
                style: 'currency',
                currency: 'EUR',
                trailingZeroDisplay: 'stripIfInteger',
            }).format(cents / 100);
        } catch {
            return (cents / 100).toFixed(2);
        }
    }
}

customElements.define('gift-grid', GiftGrid);
