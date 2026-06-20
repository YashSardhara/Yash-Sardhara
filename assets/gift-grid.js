class GiftFrud extends HTMLElement {
    connectedCallback() {
        this.softWinterJackerId = parseInt(this.dataset.swjID, 10) || null;

        this.products = {};
        const dataEl = this.querySelector('[data-gift-products]')
    }
}
customElements.define('gift-grid', GiftGrid);
