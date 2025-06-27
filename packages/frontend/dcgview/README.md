# DCGView

DCGView is a client-side javascript view library / framework.
It is a way to create a DOM to represent your data, and to update it when that data changes. DCGView is a one-directional system, data -> DOM.

[An introduction to DCGView](./introduction.md)

[Learn more about DCGView's approach](./background.md)

[Component Documentation](./components.md)

[Tutorial](../../../dcgview-inline/tutorial/README.md)

## Key DCGView concepts

### View

A view in DCGView is a javascript object which is an instance of a view class. Creating and instantiating a simple DCGView class looks like this (all examples given in tsx)

```tsx
interface Props {}

class MyViewClass extends DCGView.Class<Props> {
  template() {
    return <div>Hello world</div>;
  }
}
```

The javascript objects are long-lived, and their lifecycle will mirror that of the DOM they generate.

The template function is the only required function in a view class.

_Note: DCGView classes should not use their `constructor` to initialize member variables. Instead, they should use the `init` lifecycle method (see [Lifecycle documentation](./introduction.md#Lifecycle)). Similarly, views written in TypeScript should not use field initialization shorthand, since that compiles down to initializing fields in the constructor._

### Updates and bindings

The template function in a view is only executed once per instance, so if your view will update it needs to include bindings.

Bindings are how you declare that something may change, and should be updated. They are generally declared by providing a getter function instead of a static value. Here's a simple example of text bindings:

```tsx
interface Props {
  name: () => string;
}

class MyViewClass extends DCGView.Class<Props> {
  template() {
    return <div>Hello, {this.props.name}</div>;
  }
}
```

And of binding a class based on data

```tsx
interface Props {
  isSelected: () => boolean;
}

class MyViewClass extends DCGView.Class<Props> {
  template() {
    return (
      <div
        class={() => ({
          isSelected: this.props.isSelected()
        })}
      >
        Hello world
      </div>
    );
  }
}
```

The props are functions which always return the current value for the property. The functions here just closure in `name` and `selected` variables which are in scope in the calling function, but the function can get that data from your datastore or from the state of parent components however is most appropriate.

```js
let view = DCGView.mountToNode(SomeViewClass, document.body, {
  name: () => name,
  selected: () => selected
});
```

When those values change, due to some external process (e.g. user input, timer firing, or ajax request returning), then the user would call

```js
view.update();
```

And the bound values would be recomputed, diffed against the previous values that were set in the DOM, and then updated in the DOM if necessary.

When a node updates, it also triggers updates all of it's child nodes.

More info on the update cycle can be found in the DCGView [introduction](./introduction.md).

# Trying it out

## Pre-commit hooks

It's important to install the pre-commit hooks. They make sure you don't commit to main accidentally. They also pass your code through eslint and tslint validation. To setup the pre-commit hooks:

```bash
make setup-precommit
```

## Installing dependencies

Before running the server, install the dependencies with:

```bash
npm i
```

## Running tests

Optionally, start the build watcher with:

```bash
npm run watch
```

In another terminal, make sure the local server is running:

```bash
npm run dev
```

Go to: http://localhost:5173/tests.html

## Opening examples

Make sure the local server is running:

```bash
npm run dev
```

Go to: http://localhost:5173/examples

## Running benchmarks

Make sure the local server is running:

```bash
npm run dev
```

Go to: http://localhost:5173/benchmarks.html

## Committing changes

DCGView is heavily tested. We should not be modifying, adding, removing features without writing a test. Also, we must manually run tests before pushing changes. Lastly, if there is any chance at all that performance might be affected it's a really good idea to look at before and after comparisons of the performance benchmarks.

## Publishing the NPM package

We publish this package to our private GitHub package repository. If you haven't ever set up your local `.npmrc` to authenticate with our GitHub repository, [follow these instructions](https://docs.github.com/en/packages/guides/configuring-npm-for-use-with-github-packages#authenticating-to-github-packages) to do so. Then, to publish:

```bash
npm publish
```
