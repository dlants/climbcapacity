Some helpful components to use in the jsx-style return value from `template()`. All of these can be imported from `DCGView.Components`

### Control flow components

- **If**

  Conditionally render some content.

  Properties:

  - `predicate` (required) a function returning a boolean
    When true, the element will be rendered. When false, it is replaced with an empty `<div>` with `display: none`

  Example:

  ```tsx
    <If predicate={() => this.isVisible()}>
    {() => (
      <div>
        It's Visible!
      </div>
    );
    }
    </If>
  ```

- **IfElse**

  The IfElse component is a function taking 2 parameters: the predicate function followed by an Object specifying what template to render based on the predicate.

  The template returned by `true` renders when the predicate function returns `true`. Otherwise the template returned by the `false` key will render.

  If the `IfElse` component has a parent div, it needs to be wrapped in curly braces.

  Note that this syntax is similar to the SwitchUnion component -- IfElse is just a special case of SwitchUnion.

  Example:

  ```tsx
  <div>
    {IfElse(() => this.isVisible(), {
      true: () => <span> It's Visible! </span>,
      false: () => <span> It's Not Visible! </span>
    })}
  </div>
  ```

  or

  ```tsx
  IfElse(() => this.isVisible(), {
    true: () => <span> It's Visible! </span>,
    false: () => <span> It's Not Visible! </span>
  });
  ```

- **Each**

  Render a dynamic list of elements.

  `Each` is a function taking two arguments:

  - `arr: () => T[]` a function that returns the list of objects forming the underlying data for the view.
  - `opts` options that control how each item is rendered
    - `opts.item: (item: T, key) => JSX` a function that takes an item and returns a view for that item.
    - `opts.key: (item: T) => number | string` (optional) a function that maps each item to a key.

  If you do not provide a `key` property then the items themselves are used as keys. Each key must be unique, and all keys must be the same type -- either strings or integers.

  On every update it will recompute the list of ids, and create / destroy / reorder views to make the views match the order of keys. After sorting the items into the correct order, `update()` gets called on each item in the list.

  Example:

  ```tsx
  const { Each } = DCGView.Components;

  interface Person {
    name: string;
  }

  class StatusList extends DCGView.Class<{
    people: { [key: string]: Person };
    idOrder: string[];
  }> {
    template() {
      return Each(this.props.idOrder, {
        item: (id: string) => (
          <div class="item">name: {this.props.people[id].name}</div>
        )
      });
    }
  }
  ```

- **For**

  An older component, predating `Each`, that is also used to generate dynamic lists of elements.

  (Note: For static lists of components such as buttons in a header, just generate the children. There is no need for keys or any other update mechanism.)

  Properties:

  - `each` (required) is a list of items or keys.
  - `key` (optional) is a function that maps from an item to a key.

  If you do not provide a `key` property then it's assumed that the `each` property lists the keys. Each key must be unique, and all keys must be the same type -- either strings or integers.

  The only child to the <For/> component is a function that constructs an item based on the key.

  On every update it will recompute the list of ids, and create / destroy / reorder views to make the views match the order of keys. After sorting the items into the correct order, `update()` gets called on each item in the list.

  Example:

  ```tsx
  const { For } = DCGView.Components;

  interface Person {
    name: string;
  }

  interface ListProps {
    people: { [key: string]: Person };
    idOrder: string[];
  }
  class StatusList extends DCGView.Class<ListProps> {
    template() {
      return (
        <div class="list">
          <For each={this.props.idOrder}>
            {(id: string) => (
              <div class="item">name: {() => this.props.people()[id].name}</div>
            )}
          </For>
        </div>
      );
    }
  }
  ```

- **Switch**

  Properties:

  - `key` (required) a function returning a value, which gets passed as a parameter of the child component.
    The child component can use the value returned by `key` to conditionally return a template to load.

  Example:

  ```tsx
  <Switch key={() => this.getLoadingStatus()}>
    {(status: string) => {
      if (status === 'loading') {
        return <div>It's loading!</div>;
      } else {
        return <div>It's not loading!</div>;
      }
    }}
  </Switch>
  ```

- **SwitchUnion**

  The SwitchUnion component is a function taking 2 parameters: a function returning a string, followed by an Object specifying what template to render based on the predicate return value. While similar to the `Switch` component, it provides the additional capability to do type-checking / type-narrowing within the different branches.

  The Object parameter should have keys matching the various return values from the function parameter. Each key maps to an object returning a template that should be rendered when the function returns the key.

  If the `SwitchUnion` component has a parent div, it needs to be wrapped in curly braces.

  Example:

  ```tsx
  <div>
    {SwitchUnion(() => this.getLoadingStatus(), {
      loading: () => <div>It's loading!</div>,
      loaded: () => <div>It's loaded!</div>
    })}
  </div>
  ```

  or

  ```tsx
  SwitchUnion(() => this.getLoadingStatus(), {
    loading: () => <div>It's loading!</div>,
    loaded: () => <div>It's loaded!</div>
  });
  ```

  There is another way to call SwitchUnion, designed specifically for TypeScript disjoint unions. Here, `this.props.request` has type `() => {status: 'loading'} | {status: 'error'} | {status: 'loaded'; response: unknown}`.

  In each case of the map argument, the argument passed into the function is the narrowed case of the prop. So, `loadedRequestProp` has type `() => {status: 'loaded'; response: unknown}`

  ```tsx
  template() {
    return SwitchUnion("status", this.props.request)({
      loaded: (loadedRequestProp) => <LoadedView response={() => loadedRequestProp().response}/>,
      loading: () => <LoadingView />,
      error: (errorRequestProp) => <ErrorView message={() => errorRequestProp().message}/>
    })
  }
  ```

### Other components:

DCGView.Components also contains the following shared components. These take in state from a parent via the `value`/`checked` prop and call their `onInput`/`onChange` prop when the state is changed, passing the new state back up. In order for the input component to recognize this change, the parent must send the updated state back down. At the end of `onInput`/`onChange`, the Textarea/Input/Checkbox component will automatically update, though since a parent view usually passes in the state, that parent will need to be updated by other means.

- **Textarea**

  Properties:

  - `value` (required)
  - `onInput` (required)

- **Input**

  Properties:

  - `value` (required)
  - `onInput` (required)

- **Checkbox**

  Properties:

  - `checked` (required) () => boolean;
  - `onChange`(required) (checked: boolean) => void;

  Example:

  ```tsx
  const { Input } = DCGView.Components;

  class MyInput extends DCGView.Class {
    value: string;

    init() {
      this.value = '';
    }

    template() {
      return (
        <span>
          <Input
            value={() => this.value}
            onInput={(newValue) => {
              this.value = newValue;
              this.update();
            }}
          />
        </span>
      );
    }
  }
  ```
