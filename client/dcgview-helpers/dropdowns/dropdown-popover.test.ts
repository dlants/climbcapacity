import { isVisible, isVisibleInViewport } from '../../lib/html-helpers';
import { CalcDriver } from '../../testdriver/calcdriver';
import { createUserFixture } from '../../testdriver/fixture-helpers';

QUnit.module('DCGViewHelpers.DropdownPopoverWithAnchor');

const containerSelector = `.dcg-popover-designs__examples--custom .dcg-popover-with-anchor:eq(0)`;
const anchorSelector = `${containerSelector} .dcg-popover-with-anchor__anchor`;
const popoverSelector = `${containerSelector}  .dcg-dropdown-popover`;
const arrowSelector = `${popoverSelector}  .dcg-arrow`;
async function selectPosition(driver: CalcDriver, position: string) {
  await driver.click(`.dcg-segmented-control-btn[aria-label="${position}"]`);
}

async function togglePopover(
  driver: CalcDriver,
  selector: string = anchorSelector
) {
  await driver.click(selector);
}

QUnit.test('smoke test - popover renders, opens and closes', async (assert) => {
  QUnit.expect(5);
  const driver = await CalcDriver.build({
    url: '/admin/ui',
    fixture: { users: [createUserFixture({ role: 'admin' })] }
  });

  await driver.okEventually(
    () => !!driver.findMaybeOne(anchorSelector),
    'renders popover anchor'
  );

  assert.ok(
    !isVisible(driver.findMaybeOne(popoverSelector) as HTMLElement),
    'popover contents are not visible'
  );
  await togglePopover(driver);
  assert.ok(!!driver.findMaybeOne(popoverSelector), 'popover exists');
  assert.ok(
    isVisibleInViewport(driver.findMaybeOne(popoverSelector) as HTMLElement),
    'popover contents are visible'
  );

  await togglePopover(driver);
  assert.ok(
    !isVisible(driver.findMaybeOne(popoverSelector) as HTMLElement),
    'popover contents are not visible after clicking on the anchor again'
  );
});

QUnit.test('popover position shifts to not overflow screen', async (assert) => {
  QUnit.expect(11);
  const driver = await CalcDriver.build({
    url: '/admin/ui',
    size: { width: 2000, height: 500 },
    fixture: { users: [createUserFixture({ role: 'admin' })] }
  });

  await driver.okEventually(
    () => !!driver.findMaybeOne(anchorSelector),
    'renders popover anchor'
  );

  assert.ok(
    !isVisible(driver.findMaybeOne(popoverSelector) as HTMLElement),
    'popover contents are not visible'
  );

  await togglePopover(driver);

  assert.ok(
    isVisibleInViewport(driver.findMaybeOne(popoverSelector) as HTMLElement),
    'popover contents are visible in the viewport'
  );

  driver.assertElementMeasurements(
    popoverSelector,
    {
      left: 302,
      width: 250
    },
    15
  );

  const expectedArrowToAnchorDistance = 3;
  const tolerance = 1;
  {
    const anchorRect = driver.findOne(anchorSelector).getBoundingClientRect();
    const arrowRect = driver.findOne(arrowSelector).getBoundingClientRect();

    assert.close(
      anchorRect.left - arrowRect.left,
      expectedArrowToAnchorDistance,
      tolerance,
      'arrow left is 7px away from anchor left'
    );
  }
  driver.iframeElement.width = '1375';
  driver.findMaybeOne(containerSelector)?.scrollIntoView();

  await driver.okEventually(
    () =>
      isVisibleInViewport(driver.findMaybeOne(popoverSelector) as HTMLElement),
    'popover contents are still visible in the viewport'
  );

  await driver.wait(400); // wait for positioning debounce

  driver.assertElementMeasurements(
    popoverSelector,
    {
      left: 15,
      width: 250
    },
    undefined,
    'popover has shifted to near the edge of the screen'
  );
  {
    const anchorRect = driver.findOne(anchorSelector).getBoundingClientRect();
    const arrowRect = driver.findOne(arrowSelector).getBoundingClientRect();

    assert.close(
      anchorRect.left - arrowRect.left,
      expectedArrowToAnchorDistance,
      tolerance,
      'arrow left is 7px away from anchor left'
    );
  }

  driver.iframeElement.width = '600';
  driver.findMaybeOne(containerSelector)?.scrollIntoView();

  await driver.okEventually(
    () =>
      isVisibleInViewport(driver.findMaybeOne(popoverSelector) as HTMLElement),
    'popover contents are still visible in the viewport'
  );

  await driver.wait(400); // wait for positioning debounce

  driver.assertElementMeasurements(
    popoverSelector,
    {
      left: 15,
      width: 250
    },
    undefined,
    'popover has shifted to near the edge of the screen'
  );
  {
    const anchorRect = driver.findOne(anchorSelector).getBoundingClientRect();
    const arrowRect = driver.findOne(arrowSelector).getBoundingClientRect();

    assert.close(
      anchorRect.left - arrowRect.left,
      expectedArrowToAnchorDistance,
      tolerance,
      'arrow left is 7px away from anchor left'
    );
  }
});

QUnit.test(
  'popover with custom parent element shifts to not overflow parent rect',
  async (assert) => {
    QUnit.expect(7);
    const driver = await CalcDriver.build({
      url: '/admin/ui',
      size: { width: 800, height: 800 },
      fixture: { users: [createUserFixture({ role: 'admin' })] }
    });

    const containerSelector = '.dcg-popover-designs__example--bounded';
    const anchorSelector = `${containerSelector} .dcg-popover-with-anchor__anchor`;
    const popoverSelector = `${containerSelector}  .dcg-dropdown-popover`;

    await driver.okEventually(
      () => !!driver.findMaybeOne(anchorSelector),
      'renders popover anchor'
    );

    const boundingElement = driver.findOne(containerSelector);
    for (const position of ['bottom-left', 'top-left']) {
      await selectPosition(driver, position);
      await togglePopover(driver, anchorSelector);
      const popoverLeft = driver
        .findOne(popoverSelector)
        .getBoundingClientRect().left;
      const boundingRect = boundingElement.getBoundingClientRect();
      assert.ok(
        popoverLeft > boundingRect.left,
        `popover left edge is within the bounding rectangle for ${position} popover`
      );

      await togglePopover(driver, anchorSelector);
    }

    for (const position of ['bottom-right', 'top-right']) {
      await selectPosition(driver, position);
      await togglePopover(driver, anchorSelector);
      const popoverRight = driver
        .findOne(popoverSelector)
        .getBoundingClientRect().right;
      const boundingRect = boundingElement.getBoundingClientRect();
      assert.ok(
        popoverRight < boundingRect.right,
        `popover right edge is within the bounding rectangle for ${position} popover`
      );
      await togglePopover(driver, anchorSelector);
    }

    for (const position of ['right', 'left']) {
      await selectPosition(driver, position);
      await togglePopover(driver, anchorSelector);
      const popoverBottom = driver
        .findOne(popoverSelector)
        .getBoundingClientRect().bottom;
      const boundingRect = boundingElement.getBoundingClientRect();
      assert.ok(
        popoverBottom < boundingRect.bottom,
        `popover bottom edge is within the bounding rectangle for ${position} popover`
      );
      await togglePopover(driver, anchorSelector);
    }
  }
);
