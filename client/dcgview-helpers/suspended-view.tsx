import * as DCGView from 'dcgview';

class ShouldUpdateView extends DCGView.View<{
  shouldUpdate: () => boolean;
  children: DCGView.Child | DCGView.Children;
}> {
  template() {
    // TODO could easily make this a fragment.
    return <div>{this.props.children}</div>;
  }
  shouldUpdate() {
    return this.props.shouldUpdate();
  }
}

/**
 * Wrapper that allows temporarily suspending a DOM subtree. When
 * `suspended` is true, the subtree is marked
 * [inert](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert)
 * and its children are not updated.
 */
export class SuspendedView extends DCGView.View<{
  suspended: () => boolean;
  children: DCGView.Child | DCGView.Children;
}> {
  template() {
    return (
      <div
        inert={() => (this.props.suspended() ? true : undefined)}
        aria-hidden={() => (this.props.suspended() ? true : undefined)}
        class={() => ({
          'dcg-suspended': this.props.suspended()
        })}
      >
        <ShouldUpdateView shouldUpdate={() => !this.props.suspended()}>
          {this.props.children}
        </ShouldUpdateView>
      </div>
    );
  }
}
