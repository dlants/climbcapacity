# Introduction

This document is an overview of what DCGView is, how it works, and how it's used at Desmos.

A central task at Desmos is to display some [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction) in the browser, and to update it in response to user actions (like a click, a scroll or a window resize), network requests (like fetching the user identity or an activity the user owns) and other inputs (like a timer on an animation).

## The update cycle.

At Desmos, DCGView is typically used alongside [Flux](https://reactjs.org/blog/2014/05/06/flux.html), an architecture designed to perform this task. Flux defines an update cycle as follows:

1. The current **state** of the application is rendered into **DOM**.
2. In response to the user, a network event, or any other event, we dispatch an **action**.
3. Controllers listen to **actions**, and in response update the **state**.
4. After we finish dispatching the **action** return to step 1.

## The View

DCGView is a library to help us do step 1 of the cycle - to take the current state of the application and describe how to represent it in DOM. Furthermore, after each action, DCGView handles performing an **update** to the DOM to synchronize it with the new state.

We call this process of translating state to DOM **the view layer**. Let's take a look at an example, that defines a checkbox:

```tsx
import * as DCGView from 'dcgview';

type Props = {
  checked: () => boolean;
  dispatch: (action: Action) => void;
};

export class Checkbox extends DCGView.Class<Props> {
  template() {
    return (
      <div
        class={() => ({
          checked: this.props.checked()
        })}
        onTap={() => this.onChange()}
      >
        <span tabIndex={0} class="checkbox">
          My check <i class="pillow-icon-check" />;
        </span>
      </div>
    );
  }

  onChange(): void {
    this.props.dispatch({
      type: 'checkbox-changed',
      checked: !this.props.checked()
    });
  }
}
```

A few things to note here.

1. The view is defined by extending the `DCGView.Class` class.
2. It accepts `Props`, accessible via `this.props`, containing the `checked` property. This is how the view accesses the current state of the application.
3. It defines a `template` function, which contains a declaration of what should be rendered on the page.
4. The template uses `this.props.checked` to define what the class of the rendered checkbox should be.
5. The template also binds the `onTap` property on the `div` containing the checkbox. This attaches a listener to the DOM that dispatches (via the `dispatch` prop) an action when it is clicked, thus hooking up this view to the update cycle.

## The template & TSX/JSX

The template makes use of [JSX syntax](https://reactjs.org/docs/introducing-jsx.html). Originally developed for React, we have adapted it for use with DCGView. JSX is just syntactic sugar that allows us to write template code in an HTML-like syntax. The code above would be transpiled to something that looks like this:

```js
...
return (DCGView.createElement("div", {
    class: function () {
      return {
        checked: this.props.checked()
      };
    },
    onTap: function () { return _this.onChange(); }
  },
  DCGView.createElement("span", { tabIndex: DCGView.const(0), class: DCGView.const("checkbox")},
    DCGView.const("My check"),
    DCGView.const(" "),
    DCGView.createElement("i", { class: DCGView.const("pillow-icon-check"), "aria-hidden": DCGView.const("true") })
  )
)
...
```

This is quite clunky, with all the "createElement" and nested braces, and JSX lets us avoid all that. It's useful to note that transpilation does not recognize whitespace at the end of lines, so we manually add it via `{' '}`, explicitly defining an additional constant text node.

## Rendering & updating the view

So what happens to this view? Eventually, this view will be mounted into the DOM. During mounting, the template function is run, and produces two things:

First, the actual DOM, which is constructed via all of the `DCGView.createElement` calls.

Second, whenever `createElement` encounters an attribute that is non-constant (like the `class` attribute on the outer div), it creates a **binding**. These bindings will later be used to update the view to keep it synchronized with the application state.

In this case, the binding consists of the function,

```js
function () {
  return {
    checked: this.props.checked()
  };
}
```

, as well as a pointer to the `div` node that was mounted into the DOM during the initial run of the `template` function.

Now, whenever the view is updated, it goes through the list of all of its bindings. Each binding is re-evaluated, and if the value produced by the binding has changed, DCGView reaches into the DOM (using the pointer associated with the binding), and applies the change.

In this example, if we notice that the checkbox is no longer checked, we will reach into the DOM and change the css of the provided `div` element.

## Binding vs const

Something that's important to note here is that DCGView distinguishes between parts of the template that can change (and thus require a binding), and parts that will not change. This is where DCGView draws a performance benefit over VirtualDom frameworks, like React, since it doesn't rerun the full `template` function on every update.

You may have noticed that in the "output" of JSX, above, many of the attributes were transpiled to be wrapped in a `DCGView.const` property. This is actually because DCGView requires every attribute to be a function. `DCGView.const` is a helper that takes a value and wraps it in a special function that tells DCGView that no binding is required for this particular attribute. Every non-const attribute gets a binding.

Thankfully, JSX allows us to use nicer syntax for this piece as well, as views defined with constant attributes such as

```
<span
  tabIndex={0}
  class="checkbox"
>
```

will automatically be wrapped in `DCGView.const` when the JSX is transpiled into JS.

## Composing DCGViews

So far, we've only seen a simple DCGView with only one piece of state. In order to define more complex views, we have to look at how DCGViews are composed.

A DCGView can use another DCGView as a child as follows:

```tsx
class AccountMenu extends DCGView.Class<{
  user: () => User
  dispatch: (action: Action) => void
}> {
  template() {
    return (
      <div class="account-menu">
        <span class="user-name">{() => this.props.user().name}</span>
        <Checkbox
          checked={() => this.props.user().subscribed}
          onChange={(val: boolean) => this.props.dispatch({
            type: 'change-user-subscribed',
            userId: this.props.user().id
            subscribed: val
          })}
        >
          <span>Subscribe to our newsletter</span>
        </Checkbox>
      </div>
    );
  }
}

export class Checkbox extends DCGView.Class<{
  checked: () => boolean;
  onChange: (val: boolean) => void
  children: DCGView.Child
}> {
  template() {
    return (
      <div
        class={() => ({
            checked: this.props.checked()
          })
        }
        onTap={() => this.props.onChange(!this.props.checked())}
      >
        <span
          tabIndex={0}
          class="checkbox"
        >
          <i class="pillow-icon-check" />;
        </span>
        {this.props.children}
      </div>
    );
  }
}
```

This example shows some things about how DCGViews can be composed:

1. The parent, `AccountMenu`, makes use of the `Checkbox` component in its template. When it uses it, it is required to define the `props` for the child view, and can decompose its own props to do so.
2. It no longer makes sense for our generic `Checkbox` component to dispatch an action itself, so instead it takes an `onChange` property, so its parent can decide what sort of action should be dispatched when the checkbox is checked.
3. The `Checkbox` component's template was changed to slot in `this.props.children`. This provides a spot for the component to put any children that the parent passes down into it, in this case the "Subscribe to our newsletter" message.

One more thing to note here is that now, whenever the parent `AccountMenu` is updated, it will also call the `update` method on all of its children.

## DCGView Components

So far, we've seen how DCGView can be used to control the text, classes and various other attributes of the DOM that it renders, but there are a few more things that we often want to do:

1. Conditionally create and destroy components.
2. Show lists of components.

In order to accomplish this, DCGView comes with some helper components. Here we will describe a couple of them:

```tsx
import * as DCGView from 'dcgview';
const { If, For } = DCGView.Components;

class TodoList extends DCGView.Class<{
  todos: () => TodoItem[];
}> {
  template() {
    return (
      <div class="todo-list">
        <If predicate={() => this.props.todos().length == 0}>
          {() => <div class="empty">This list is empty</div>}
        </If>
        <div class="todo-items">
          <For each={() => this.props.todos()} key={(todo) => todo.id}>
            {(getItem) => <TodoItemView item={getItem} />}
          </For>
        </div>
      </div>
    );
  }
}
```

### If

First is the `If` component. This component takes a `predicate` prop that is a function that returns a boolean. This component also requires a single child that is a function. This function will only be executed and the resulting view mounted if the predicate returns `true`. If, during an update, the `predicate` is evaluated to false, the child will be unmounted and destroyed.

### For

Next is the `For` component. This component takes an `each` prop that should return an array of items. `For` must have a single child that defines the container into which the rendered items will be put. That container child must in turn have a single child that is a function that defines how a single item is rendered.

All `For` invocations must be keyed! This means that either the `item` itself is a (string) key, or we are supplied with an additional `key` prop that takes an item and extracts a key from it. These keys **must be unique and DCGView will throw an error if they are not**.

When `For` updates, it first obtains the new list of keys. We synchronize the list of rendered views with the new list of keys by:

1. Destroying any views that no longer have a matching key.
2. Rendering new views for any key that does not have a view.
3. Calling `update` on any view that already exists and matches a key.
4. Reordering the views within the parent container to match the new order of keys.

This is done to minimize the number of mutations we do to the DOM, as such mutations are slow.

You can read about other DCGComponents like `IfElse` and `Switch` [here](./components.md).

## The costs of performance

As mentioned earlier, DCGView only runs the `template` function once when the view is mounted. After, when the view is updated, DCGView only evaluates the bindings to keep the view synchronized with the state. This design choice comes with a nice performance boost, but also with some complexity overhead since the developer needs to be conscious of what parts of the `template` function will be re-evaluated during an update. This has a few consequences:

### 1. Props must be functions

When a binding is re-evaluated it needs a way to get at the _current_ value of a prop, not the value at the time that the `template` function was run. This means that all props must be getters, so they can be re-evaluated whenever a binding is called during an update.

### 2. Getters don't play nice with TypeScript

Unfortunately, because we use getters, we don't get the benefit of automatic type-narrowing from typescript. For example, this will result in a type error:

```tsx
class UserView extends DCGView.Class<{
  user: () => User | undefined
}> {
  template() {
    return  <If predicate={() => !!this.props.user()}>{() =>
      return <span>{() =>
        "the user name is " + this.props.user().name // Type Error: this.props.user() may be undefined
      }</span>
    }</If>
  }
}
```

This is because TypeScript sees that there is no guarantee that two separate invocations of `this.props.user()` (the first in the predicate and the second in the child of the `If` component) will return the same value.

In practice, we know that this will be true, and so we must work around this in one of two ways:

1. We have helper components, like `DCGView.IfDefined`, that do the type narrowing for us:

```tsx
template() {
  return <div>{IfDefined(this.props.user, (definedUserProp) =>
    <span>{() => "the user name is " + definedUserProp().name}</span>
  )}</div>
}
```

Here, while `this.props.user` has type `() => User | undefined`, the `IfDefined` component narrows the type for us, so `definedUserProp` has type `() => User`.

2. In some cases, manual type casts (using the `!` operator or the `as` keyword) cannot be avoided. Use these sparingly and document each with a comment explaining why the type cast is appropriate.

### 3. Be wary of breaking the getter chain

A mistake that is common when getting started with DCGView is breaking the getter chain. Let's look at an example:

```tsx
class RequestView extends DCGView.Class<{
  request: () => {
    status: 'loaded',
    response: string
  } | {
    status: 'loading'
  } | {
    status: 'error',
    message: string'
  }
}> {
  template() {
    // WARNING - DO NOT DO THIS!
    const request = this.props.request()
    return <Switch key={() => request.status}>{() => {
      switch (request.status) {
        case "loaded":
          return <LoadedView response={() => request.response} />
        case "loading":
          return <LoadingView />
        case "error":
          return <ErrorView message={() => request.error}/>
      }
    }}</Switch>
  }
}
```

So what is the issue here? We accessed `this.props.request` during the rendering of the `template` function, and saved the result in `const request`. Now, when `RequestView` or its children (`LoadedView`, `LoadingView`, and `ErrorView`) update, they will not invoke the `this.props.request` getter again, but instead read from the `request` variable. This breaks the getter chain and the view will no longer sync with the state during the update.

**Make sure you do not persist the output of props in local variables, but instead call the prop every time!**

Here's how to fix the above example:

```tsx
  template() {
    return <Switch key={() => this.props.request().status}>{(requestStatus) => {
      switch (requestStatus) {
        case "loaded":
          return <LoadedView response={() => (this.props.request() as {staus: 'loaded', response: string}).response} />
        case "loading":
          return <LoadingView />
        case "error":
          return <ErrorView message={() => (this.props.request() as {status: 'error', message: string}).message}/>
      }
    }}</Switch>
  }
```

Note that now whenever we re-evaluate the `key` binding in `Switch`, the `response` binding in `LoadedView` or the `message` binding in `ErrorView`, we will re-evaluate the `this.props.request` prop and correctly get the current value.

Unfortunately, as you can see, we now also have to do manual casts to narrow the type of `this.props.request`. This switch case is so common that we created the DCGView Component `SwitchUnion` to help work around this issue:

```tsx
template() {
  return <div>{
    SwitchUnion("status", this.props.request)({
      loaded: (loadedRequestProp) => <LoadedView response={() => loadedRequestProp().response}/>,
      loading: () => <LoadingView />,
      error: (errorRequestProp) => <ErrorView message={() => errorRequestProp().message}/>
    })
  }</div>
}
```

When it updates, `SwitchUnion` will evaluate `this.props.request` and examine its `status` field. It will then invoke the corresponding function from the provided view map. It creates and casts the narrowed props for you, so `loadedRequestProp` has type `() => {status: 'loaded', response: string}` and invokes `this.props.request`. So it is safe and convenient to use as a prop in a child view.

### Lifecycle

The lifecycle of a view is:

- `init`
- `willMount`
- `template`
- `didMount`
- `didUpdate`
- `willUnmount`
- `didUnmount`

None of these lifecycle methods take any parameters.

Creation and Mounting: Views are created during a call to `DCGView.mountToNode`. That call will create an instance of the root-level view class, call its `init` method to initialize any member variables, and then call its `template` method to construct any child views. Views created during the call to `template` will be registered as children, and will also have their `init` and `template` functions called. Once the full tree of views has been created, and all template functions have been called, then the HTML generated will be inserted into the DOM, and `didMount` will be called on all views created this way, with children called before parents.

Update: If a `shouldUpdate` function is defined and returns false, then this will short-circuit updates for that node and all children. Otherwise, all bindings will be updated, and then `update` will be called recursively on all children of that node. Some utility components override the `update` function; for example, a `HideView` component will want to update its own visibility, but prevent its children from updating if it is not visible. This is not recommended for most application views, but it is the only way to build views which dynamically create, destroy, and replace their children.

Unmounting: You can unmount a view by calling `DCGView.unmountFromNode(node)`. That will call the `willUnmount` handler recursively. Then remove the DOM from the node. Then call `onUnmount`. Then call `didUnmount` recursively.

## Further reading

You can read about how some other frameworks approach this problem [here](./background.md)

You can find component (If, For, IfElse, etc) documentation and examples [here](./components.md).
