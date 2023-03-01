import { QUnit, sinon } from 'https://tritarget.org/cdn/testing.js';
import Component from '../component.js';
import { Tracked } from '../tracking.js';

const { module, test } = QUnit;
const nextMicroTask = () => Promise.resolve();
const uniqueTagName = ((i) => () => `x-test-component${++i}`)(0);

module('component', function (hooks) {
  hooks.beforeEach(function () {
    this.fixture = document.querySelector('#qunit-fixture');
  });

  test('registers as a custom element', function () {
    let testTagName = uniqueTagName();
    class TestComponent extends Component {
      static get tagName() {
        return testTagName;
      }
    }
    sinon.stub(customElements, 'define');

    TestComponent.register();

    sinon.assert.calledWith(
      customElements.define,
      testTagName,
      sinon.match.same(TestComponent)
    );
  });

  test('renders when changes to tracked properties on self', async function () {
    let testTagName = uniqueTagName();
    class TestComponent extends Component {
      foo = new Tracked();
      render() {
        this.foo;
      }
      static get tagName() {
        return testTagName;
      }
    }
    TestComponent.register();

    let subject = document.createElement(testTagName);
    let renderSpy = sinon.spy(subject, 'render');

    this.fixture.appendChild(subject);
    await nextMicroTask();
    sinon.assert.calledOnce(renderSpy);

    subject.foo = 'BAR';
    await nextMicroTask();
    sinon.assert.calledTwice(renderSpy);
  });

  test('renders when changes to tracked properties not on self', async function () {
    let testTagName = uniqueTagName();
    let testTracked = new Tracked();
    class TestComponent extends Component {
      get foo() {
        return testTracked.value;
      }
      render() {
        this.foo;
      }
      static get tagName() {
        return testTagName;
      }
    }
    TestComponent.register();

    let subject = document.createElement(testTagName);
    let renderSpy = sinon.spy(subject, 'render');

    this.fixture.appendChild(subject);
    await nextMicroTask();
    sinon.assert.calledOnce(renderSpy);

    testTracked.dirty();
    await nextMicroTask();
    sinon.assert.calledTwice(renderSpy);
  });

  test('renders when changes to observed attributes', async function () {
    let testTagName = uniqueTagName();
    class TestComponent extends Component {
      render() {
        this.hasAttribute('data-has-unobserved');
        this.hasAttribute('data-has-observed');
        this.getAttribute('data-get-unobserved');
        this.getAttribute('data-get-observed');
      }
      static get observedAttributes() {
        return ['data-has-observed', 'data-get-observed'];
      }
      static get tagName() {
        return testTagName;
      }
    }
    TestComponent.register();

    let subject = document.createElement(testTagName);
    let renderSpy = sinon.spy(subject, 'render');

    this.fixture.appendChild(subject);
    await nextMicroTask();
    sinon.assert.calledOnce(renderSpy);

    subject.setAttribute('data-has-unobserved', 'foo');
    await nextMicroTask();
    sinon.assert.calledOnce(renderSpy);

    subject.setAttribute('data-has-observed', 'foo');
    await nextMicroTask();
    sinon.assert.calledTwice(renderSpy);

    subject.setAttribute('data-get-unobserved', 'foo');
    await nextMicroTask();
    sinon.assert.calledTwice(renderSpy);

    subject.setAttribute('data-get-observed', 'foo');
    await nextMicroTask();
    sinon.assert.calledThrice(renderSpy);
  });

  test('renders when changes to tracked properties via yields', async function () {
    let testTagName1 = uniqueTagName();
    class TestComponent1 extends Component {
      foo = new Tracked();
      static get tagName() {
        return testTagName1;
      }
    }
    TestComponent1.register();

    let testTagName2 = uniqueTagName();
    class TestComponent2 extends Component {
      render(yielded) {
        yielded[testTagName1].foo;
      }
      static get tagName() {
        return testTagName2;
      }
    }
    TestComponent2.register();

    let wrapper = document.createElement(testTagName1);
    let subject = document.createElement(testTagName2);
    let renderSpy = sinon.spy(subject, 'render');

    wrapper.appendChild(subject);
    this.fixture.appendChild(wrapper);
    await nextMicroTask();
    sinon.assert.calledOnce(renderSpy);

    wrapper.foo = 'BAR';
    await nextMicroTask();
    sinon.assert.calledTwice(renderSpy);
  });

  test('does not render when changes to tracked properties not used by render', async function () {
    let testTagName = uniqueTagName();
    class TestComponent extends Component {
      foo = new Tracked();
      render() {
        this.bar;
      }
      static get tagName() {
        return testTagName;
      }
    }
    TestComponent.register();

    let subject = document.createElement(testTagName);
    let renderSpy = sinon.spy(subject, 'render');

    this.fixture.appendChild(subject);
    await nextMicroTask();
    sinon.assert.calledOnce(renderSpy);

    subject.foo = 'BAR';
    await nextMicroTask();
    sinon.assert.calledOnce(renderSpy);
  });

  module('light DOM', function () {
    test('<template> with ID', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
      }

      this.fixture.innerHTML = `
        <template id="${testTagName}">
          <p>test-content</p>
        </template>
        <${testTagName} id="test-subject"></${testTagName}>
      `;

      TestComponent.register();
      await nextMicroTask();
      assert.equal(
        this.fixture.querySelector('#test-subject').textContent.trim(),
        'test-content'
      );
    });

    test('.template getter', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get template() {
          return `<p>test-content</p>`;
        }
      }
      TestComponent.register();

      this.fixture.innerHTML = `
        <${testTagName} id="test-subject"></${testTagName}>
      `;

      await nextMicroTask();
      assert.equal(
        this.fixture.querySelector('#test-subject').textContent.trim(),
        'test-content'
      );
    });

    test('slots', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get template() {
          return `<p data-test="wrapper"><slot></slot></p>`;
        }
      }
      TestComponent.register();

      this.fixture.innerHTML = `
        <${testTagName} id="test-subject">
          <span data-test="slot-wrapper">test-content</span>
        </${testTagName}>
      `;

      await nextMicroTask();
      assert.equal(
        this.fixture.querySelector('#test-subject > p').dataset.test,
        'wrapper'
      );
      assert.equal(
        this.fixture.querySelector('#test-subject > p > span').dataset.test,
        'slot-wrapper'
      );
      assert.equal(
        this.fixture.querySelector('#test-subject > p > span').textContent.trim(),
        'test-content'
      );
    });

    test('named slots', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get template() {
          return `<p data-test="wrapper"><slot name="test"></slot></p>`;
        }
      }
      TestComponent.register();

      this.fixture.innerHTML = `
        <${testTagName} id="test-subject">
          <span data-test="slot-wrapper" slot="test">test-content</span>
        </${testTagName}>
      `;

      await nextMicroTask();
      assert.equal(
        this.fixture.querySelector('#test-subject > p').dataset.test,
        'wrapper'
      );
      assert.equal(
        this.fixture.querySelector('#test-subject > p > span').dataset.test,
        'slot-wrapper'
      );
      assert.equal(
        this.fixture.querySelector('#test-subject > p > span').textContent.trim(),
        'test-content'
      );
    });

    test('createElement support', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get template() {
          return `<p>test-content</p>`;
        }
      }
      TestComponent.register();

      let testSubject = document.createElement(testTagName);
      testSubject.setAttribute('id', 'test-subject');
      this.fixture.appendChild(testSubject);

      await nextMicroTask();
      assert.equal(
        this.fixture.querySelector('#test-subject').textContent.trim(),
        'test-content'
      );
    });

    test('safe to add/remove element', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get template() {
          return `<p>test-content</p>`;
        }
      }
      TestComponent.register();

      let testSubject = document.createElement(testTagName);
      testSubject.setAttribute('id', 'test-subject');

      this.fixture.appendChild(testSubject);
      await nextMicroTask();
      testSubject.remove();
      await nextMicroTask();
      this.fixture.appendChild(testSubject);
      await nextMicroTask();

      assert.equal(
        this.fixture.querySelector('#test-subject').textContent.trim(),
        'test-content'
      );
    });
  });

  module('shadow DOM', function () {
    test('slots', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get shadow() {
          return `<p data-test="wrapper"><slot></slot></p>`;
        }
      }
      TestComponent.register();

      this.fixture.innerHTML = `
        <${testTagName} id="test-subject">
          <span data-test="slot-wrapper">test-content</span>
        </${testTagName}>
      `;

      await nextMicroTask();
      let shadow = this.fixture.querySelector('#test-subject').shadowRoot;
      assert.equal(
        shadow.querySelector('p').dataset.test,
        'wrapper'
      );
      assert.equal(
        this.fixture.querySelector(`${testTagName} > span`).dataset.test,
        'slot-wrapper'
      );
      assert.equal(
        this.fixture.querySelector(`${testTagName} > span`).textContent.trim(),
        'test-content'
      );
    });

    test('named slots', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get shadow() {
          return `<p data-test="wrapper"><slot name="test"></slot></p>`;
        }
      }
      TestComponent.register();

      this.fixture.innerHTML = `
        <${testTagName} id="test-subject">
          <span data-test="slot-wrapper" slot="test">test-content</span>
        </${testTagName}>
      `;

      await nextMicroTask();
      let shadow = this.fixture.querySelector('#test-subject').shadowRoot;
      assert.equal(
        shadow.querySelector('p').dataset.test,
        'wrapper'
      );
      assert.equal(
        this.fixture.querySelector(`${testTagName} > span`).dataset.test,
        'slot-wrapper'
      );
      assert.equal(
        this.fixture.querySelector(`${testTagName} > span`).textContent.trim(),
        'test-content'
      );
    });

    test('<template data-shadow> with ID', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
      }

      this.fixture.innerHTML = `
        <template id="${testTagName}" data-shadow>
          <p>test-content</p>
        </template>
        <${testTagName} id="test-subject"></${testTagName}>
      `;

      TestComponent.register();
      await nextMicroTask();
      assert.equal(
        this.fixture.querySelector('#test-subject').shadowRoot.textContent.trim(),
        'test-content'
      );
    });

    test('.shadow getter', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get shadow() {
          return `<p>test-content</p>`;
        }
      }
      TestComponent.register();

      this.fixture.innerHTML = `
        <${testTagName} id="test-subject"></${testTagName}>
      `;

      await nextMicroTask();
      assert.equal(
        this.fixture.querySelector('#test-subject').shadowRoot.textContent.trim(),
        'test-content'
      );
    });

    test('createElement support', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get shadow() {
          return `<p>test-content</p>`;
        }
      }
      TestComponent.register();

      let testSubject = document.createElement(testTagName);
      testSubject.setAttribute('id', 'test-subject');
      this.fixture.appendChild(testSubject);

      await nextMicroTask();
      assert.equal(
        this.fixture.querySelector('#test-subject').shadowRoot.textContent.trim(),
        'test-content'
      );
    });

    test('safe to add/remove element', async function (assert) {
      let testTagName = uniqueTagName();
      class TestComponent extends Component {
        static get tagName() {
          return testTagName;
        }
        static get shadow() {
          return `<p>test-content</p>`;
        }
      }
      TestComponent.register();

      let testSubject = document.createElement(testTagName);
      testSubject.setAttribute('id', 'test-subject');

      this.fixture.appendChild(testSubject);
      await nextMicroTask();
      testSubject.remove();
      await nextMicroTask();
      this.fixture.appendChild(testSubject);
      await nextMicroTask();

      assert.equal(
        this.fixture.querySelector('#test-subject').shadowRoot.textContent.trim(),
        'test-content'
      );
    });
  });
});
