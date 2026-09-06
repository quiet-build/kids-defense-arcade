import { mount } from './mount';
import css from './style.css?inline';
class ArcadeElement extends HTMLElement {
  connectedCallback() {
    if (this.session) return;
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    const send = (name, detail = {}) => this.dispatchEvent(new CustomEvent(name, { detail: { gameId: 'defense-arcade', ...detail }, bubbles: true, composed: true }));
    try {
      const style = document.createElement('style');
      style.textContent = css.replace(':root', ':host').replace(/\bbody\s*\{/g, ':host{').replaceAll('@media', '@container') + ':host{display:block;min-width:0;min-height:0;container-type:inline-size}';
      const container = document.createElement('div');
      shadow.replaceChildren(style, container);
      this.session = mount(container, () => send('pma-ready'), detail => send('pma-round-ended', detail));
    } catch (error) {
      this.session?.dispose(); this.session = undefined; shadow.replaceChildren();
      console.error('Unable to start defense-arcade', error);
      send('pma-error', { message: 'Unable to start game. Please try again.' });
    }
  }
  disconnectedCallback() { this.session?.dispose(); this.session = undefined; this.shadowRoot?.replaceChildren(); }
  pause() { this.session?.pause(); }
}
if (!customElements.get('pma-defense-arcade')) customElements.define('pma-defense-arcade', ArcadeElement);
