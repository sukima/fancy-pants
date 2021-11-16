/* globals QUnit sinon */
import {
  Tracked,
  Cache,
  tracked,
  activateTracking,
  setScheduleRerender,
  setCurrentTracker
} from '../tracking.js';
import { scheduleRender } from '../rendering.js';

const { module, test } = QUnit;

let mockTracker;
let scheduleRerenderCount;

function createMockRenderer() {
  scheduleRerenderCount = 0;
  return () => scheduleRerenderCount++;
}

function createMockTracker() {
  mockTracker = new Set();
  return mockTracker;
}

function setupMockTracker(hooks) {
  hooks.beforeEach(() => setCurrentTracker(createMockTracker()));
  hooks.afterEach(() => setCurrentTracker(null));
}

function setupTestRenderer(hooks) {
  hooks.beforeEach(() => setScheduleRerender(createMockRenderer()));
  hooks.afterEach(() => setScheduleRerender(scheduleRender));
}

module('tracking', function (hooks) {
  setupTestRenderer(hooks);

  module('tracked()', function () {
    test('returns a Tracked instance', function (assert) {
      let subject = tracked('FOO');
      assert.ok(subject instanceof Tracked, 'with initial value');
      assert.strictEqual(subject.value, 'FOO', 'initial value set');

      subject = tracked();
      assert.ok(subject instanceof Tracked, 'without initial value');
      assert.strictEqual(subject.value, undefined, 'initial value set');
    });
  });

  module('activateTracking()', function () {
    test('activates tracking on POJOs', function (assert) {
      let subject = activateTracking({ foo: tracked('FOO') });
      assert.strictEqual(subject.foo, 'FOO');
      subject.foo = 'BAR';
      assert.strictEqual(subject.foo, 'BAR');
      assert.strictEqual(scheduleRerenderCount, 1, 'renderer called');
    });

    test('activates tracking on class instances', function (assert) {
      class Foo {
        foo = tracked('FOO');
      }
      let subject = activateTracking(new Foo());
      assert.strictEqual(subject.foo, 'FOO');
      subject.foo = 'BAR';
      assert.strictEqual(subject.foo, 'BAR');
      assert.strictEqual(scheduleRerenderCount, 1, 'renderer called');
    });
  });

  module('Tracked', function (hooks) {
    setupMockTracker(hooks);

    test('#value getter/setter', function (assert) {
      let subject = new Tracked('FOO');
      let originalRevision = subject.revision;
      assert.strictEqual(subject.value, 'FOO');
      subject.value = 'BAR';
      assert.strictEqual(subject.value, 'BAR');
      assert.strictEqual(subject.revision, originalRevision + 1, 'revision');
      assert.strictEqual(scheduleRerenderCount, 1, 'renderer called');
    });

    test('#dirty()', function (assert) {
      let subject = new Tracked();
      let originalRevision = subject.revision;
      subject.dirty();
      assert.strictEqual(subject.revision, originalRevision + 1, 'revision');
      assert.strictEqual(scheduleRerenderCount, 1, 'renderer called');
      assert.strictEqual(mockTracker.size, 0, 'tracker size');
    });

    test('#consume()', function (assert) {
      let subject = new Tracked();
      let originalRevision = subject.revision;
      subject.consume();
      assert.strictEqual(subject.revision, originalRevision, 'revision');
      assert.strictEqual(scheduleRerenderCount, 0, 'renderer not called');
      assert.strictEqual(mockTracker.size, 1, 'tracker size');
    });

    test('.for()', function (assert) {
      let subject = { foo: 'FOO' };
      let trackedSubject = Tracked.for(subject, 'foo');
      assert.ok(trackedSubject instanceof Tracked, 'returns Tracked instance');
      assert.strictEqual(trackedSubject, Tracked.for(subject, 'foo'));
      assert.strictEqual(trackedSubject.value, undefined);
      assert.strictEqual(subject.foo, 'FOO');

      trackedSubject = Tracked.for(subject, 'bar', () => 'BAR');
      assert.strictEqual(trackedSubject.value, 'BAR');
      assert.strictEqual(subject.foo, 'FOO');
    });

    test('.proxy()', function (assert) {
      let subject = { foo: 'FOO' };
      let proxySubject = Tracked.proxy(subject);

      assert.strictEqual(subject.foo, 'FOO');
      assert.strictEqual(proxySubject.foo, 'FOO');
      assert.strictEqual(scheduleRerenderCount, 0, 'renderer not called');

      subject.foo = 'BAR';
      assert.strictEqual(proxySubject.foo, 'BAR');
      assert.strictEqual(subject.foo, 'BAR');
      assert.strictEqual(scheduleRerenderCount, 0, 'renderer not called');

      proxySubject.foo = 'BAZ';
      assert.strictEqual(proxySubject.foo, 'BAZ');
      assert.strictEqual(subject.foo, 'BAZ');
      assert.strictEqual(scheduleRerenderCount, 1, 'renderer called');
    });

    test('.defineProperty()', function (assert) {
      let subject = { foo: 'FOO' };
      let trackedSubject = new Tracked();
      let originalRevision = trackedSubject.revision;
      Tracked.defineProperty(subject, 'bar', trackedSubject);
      Tracked.defineProperty(subject, 'baz');

      subject.bar = 'BAR';
      assert.strictEqual(subject.bar, 'BAR');
      assert.strictEqual(scheduleRerenderCount, 1, 'renderer called');
      assert.strictEqual(trackedSubject.revision, originalRevision + 1, 'revision');

      subject.baz = 'BAZ';
      assert.strictEqual(subject.baz, 'BAZ');
      assert.strictEqual(scheduleRerenderCount, 2, 'renderer called');
    });

    test('.activate() with POJOs', function (assert) {
      let subject = Tracked.activate({ foo: tracked('FOO') });
      assert.strictEqual(subject.foo, 'FOO');
      subject.foo = 'BAR';
      assert.strictEqual(subject.foo, 'BAR');
      assert.strictEqual(scheduleRerenderCount, 1, 'renderer called');
    });

    test('.activate() with class instances', function (assert) {
      class Foo {
        foo = tracked('FOO');
      }
      let subject = Tracked.activate(new Foo());
      assert.strictEqual(subject.foo, 'FOO');
      subject.foo = 'BAR';
      assert.strictEqual(subject.foo, 'BAR');
      assert.strictEqual(scheduleRerenderCount, 1, 'renderer called');
    });
  });

  module('Cache', function () {
    test('#execute()', function (assert) {
      let resultCount = 0;
      let trackedSubject = new Tracked();
      let cachedFunc = sinon.stub().callsFake(() => {
        trackedSubject.consume();
        return `test-result-${++resultCount}`;
      });
      let subject = new Cache(cachedFunc);
      let result = subject.execute('FOO');
      sinon.assert.calledOnce(cachedFunc);
      sinon.assert.calledWith(cachedFunc, 'FOO');
      assert.strictEqual(result, 'test-result-1');

      result = subject.execute('BAR');
      sinon.assert.calledOnce(cachedFunc);
      assert.strictEqual(result, 'test-result-1');

      trackedSubject.dirty();
      result = subject.execute('BAZ');
      sinon.assert.calledTwice(cachedFunc);
      sinon.assert.calledWith(cachedFunc, 'BAZ');
      assert.strictEqual(result, 'test-result-2');
    });

    test('#value', function (assert) {
      let resultCount = 0;
      let trackedSubject = new Tracked();
      let cachedFunc = sinon.stub().callsFake(() => {
        trackedSubject.consume();
        return `test-result-${++resultCount}`;
      });
      let subject = new Cache(cachedFunc);
      let result = subject.value;
      sinon.assert.calledOnce(cachedFunc);
      assert.strictEqual(result, 'test-result-1');

      result = subject.value;
      sinon.assert.calledOnce(cachedFunc);
      assert.strictEqual(result, 'test-result-1');

      trackedSubject.dirty();
      result = subject.value;
      sinon.assert.calledTwice(cachedFunc);
      assert.strictEqual(result, 'test-result-2');
    });

    test('#revision', function (assert) {
      let trackedSubject = new Tracked();
      let subject = new Cache(() => trackedSubject.consume());
      assert.strictEqual(subject.revision, 0);
      subject.execute();
      let lastRevision = trackedSubject.revision;
      assert.strictEqual(subject.revision, lastRevision);
      trackedSubject.dirty();
      assert.strictEqual(subject.revision, lastRevision + 1);
    });

    test('.memoize()', function (assert) {
      let resultCount = 0;
      let trackedSubject = new Tracked();
      let cachedFunc = sinon.stub().callsFake(() => {
        trackedSubject.consume();
        return `test-result-${++resultCount}`;
      });
      let subject = Cache.memoize(cachedFunc);
      let result = subject('FOO');
      sinon.assert.calledOnce(cachedFunc);
      sinon.assert.calledWith(cachedFunc, 'FOO');
      assert.strictEqual(result, 'test-result-1');

      result = subject('BAR');
      sinon.assert.calledOnce(cachedFunc);
      assert.strictEqual(result, 'test-result-1');

      trackedSubject.dirty();
      result = subject('BAZ');
      sinon.assert.calledTwice(cachedFunc);
      sinon.assert.calledWith(cachedFunc, 'BAZ');
      assert.strictEqual(result, 'test-result-2');
    });
  });
});
