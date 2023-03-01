import { QUnit, sinon } from 'https://tritarget.org/cdn/testing.js';
import {
  registerRenderer,
  unregisterRenderer,
  scheduleRender
} from '../rendering.js';

const { module, test } = QUnit;
const nextMicroTask = () => Promise.resolve();

module('rendering', function () {
  test('schedules one rendering cycle at a time', async function () {
    let mockRenderer = sinon.spy();

    registerRenderer(mockRenderer);

    try {
      scheduleRender();
      scheduleRender();
      scheduleRender();
      scheduleRender();
      scheduleRender();
      await nextMicroTask();
    } finally {
      unregisterRenderer(mockRenderer);
    }

    sinon.assert.calledOnce(mockRenderer);
  });
});
