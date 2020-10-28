import Component from '../fancy-pants/component.js';

class ExampleSource extends Component {
  constructor() {
    super();
    this.exampleSource = this.innerHTML.trim();
    if (this.hasAttribute('strip-script')) {
      this.exampleSource = this.exampleSource
        .replace(/<\/?script[^>]*>/g, '')
        .trim();
    }
  }
  render() {
    let lang = this.getAttribute('lang') || 'js';
    let code = document.createElement('code');
    let pre = document.createElement('pre');
    pre.className = `prettyprint source lang-${lang}`;
    code.textContent = this.exampleSource;
    pre.appendChild(code);
    this.appendChild(pre);
    window.PR.prettyPrint(null, pre);
  }
  get preTag() {
    return document.querySelector('pre.prettyprint');
  }
}

ExampleSource.register();
