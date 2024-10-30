import React, { useCallback } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

export type Update<Msg, Model> = (
  msg: Msg,
  model: Model,
) => [Model] | [Model, Thunk<Msg> | undefined];
export type View<Msg, Model> = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => JSX.Element;
export type Dispatch<Msg> = (msg: Msg) => void;

export interface Subscription<SubscriptionType extends string> {
  /** Must be unique!
   */
  id: SubscriptionType;
}

export type SubscriptionManager<SubscriptionType extends string, Msg> = {
  [K in SubscriptionType]: {
    subscribe(dispatch: Dispatch<Msg>): void;
    unsubscribe(): void;
  };
};

export function createApp<Model, Msg, SubscriptionType extends string>({
  initialModel,
  update,
  view,
  sub,
}: {
  initialModel: Model;
  update: Update<Msg, Model>;
  view: View<Msg, Model>;
  sub?: {
    subscriptions: (model: Model) => Subscription<SubscriptionType>[];
    subscriptionManager: SubscriptionManager<SubscriptionType, Msg>;
  };
}) {
  let dispatchRef: { current: Dispatch<Msg> | undefined } = {
    current: undefined,
  };

  function App() {
    const [model, setModel] = React.useState(initialModel);
    const subsRef = React.useRef<{
      [id: string]: Subscription<SubscriptionType>;
    }>({});

    const dispatch = useCallback(
      (msg: Msg) => {
        setModel(currentModel => {
          const [nextModel, thunk] = update(msg, currentModel);

          if (thunk) {
            // purposefully do not await
            thunk(dispatch);
          }

          return nextModel
        });

      },
      [],
    );

    dispatchRef.current = dispatch;

    React.useEffect(() => {
      if (!sub) return;
      const subscriptionManager = sub.subscriptionManager;
      const currentSubscriptions = subsRef.current;

      const nextSubs = sub.subscriptions(model);
      const nextSubsMap: { [id: string]: Subscription<SubscriptionType> } = {};

      // Add new subs
      nextSubs.forEach((sub) => {
        nextSubsMap[sub.id] = sub;
        if (!subscriptionManager[sub.id]) {
          subscriptionManager[sub.id].subscribe(dispatch);
          currentSubscriptions[sub.id] = sub;
        }
      });

      // Remove old subs
      Object.keys(currentSubscriptions).forEach((id) => {
        if (!nextSubsMap[id]) {
          subscriptionManager[id as SubscriptionType].unsubscribe();
          delete subsRef.current[id];
        }
      });

      return () => {};
    }, [model]);

    return view({ model, dispatch });
  }

  return {
    mount(element: Element) {
      const root = createRoot(element);
      flushSync(() => root.render(<App />));
      return { root, dispatchRef };
    },
  };
}

export type Thunk<Msg> = (dispatch: Dispatch<Msg>) => Promise<void>;

export function wrapThunk<MsgType extends string, InnerMsg>(
  msgType: MsgType,
  thunk: Thunk<InnerMsg> | undefined,
): Thunk<{ type: MsgType; msg: InnerMsg }> | undefined {
  if (!thunk) {
    return undefined;
  }
  return (dispatch: Dispatch<{ type: MsgType; msg: InnerMsg }>) =>
    thunk((msg: InnerMsg) => dispatch({ type: msgType, msg }));
}

export function chainThunks<Msg>(
  ...thunks: (Thunk<Msg> | undefined)[]
): Thunk<Msg> {
  return async (dispatch) => {
    for (const thunk of thunks) {
      if (thunk) {
        await thunk(dispatch);
      }
    }
  };
}
