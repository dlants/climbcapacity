import { Root, createRoot } from "react-dom/client";

export type Update<Msg, Model> = (
  msg: Msg,
  model: Model,
) => [Model] | [Model, Thunk<Msg> | undefined];
export type View<Msg, Model> = (
  model: Model,
  dispatch: (msg: Msg) => void,
) => JSX.Element;
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

export class App<Model, Msg, SubscriptionType extends string> {
  private model: Model;
  private update: Update<Msg, Model>;
  private view: View<Msg, Model>;
  private root: Root;
  private currentSubscriptions: Partial<{
    [id in SubscriptionType]: Subscription<SubscriptionType>;
  }>;
  private sub:
    | {
        subscriptions: (model: Model) => Subscription<SubscriptionType>[];
        subscriptionManager: SubscriptionManager<SubscriptionType, Msg>;
      }
    | undefined;

  constructor({
    initialModel,
    update,
    view,
    element,
    sub,
  }: {
    initialModel: Model;
    update: Update<Msg, Model>;
    view: View<Msg, Model>;
    element: Element;
    sub?: {
      subscriptions: (model: Model) => Subscription<SubscriptionType>[];
      subscriptionManager: SubscriptionManager<SubscriptionType, Msg>;
    };
  }) {
    this.update = update;
    this.model = initialModel;
    this.currentSubscriptions = {};
    this.sub = sub;
    this.updateSubscriptions();
    this.view = view;
    this.root = createRoot(element);
    this.root.render(view(this.model, this.dispatch.bind(this)));
  }

  updateSubscriptions() {
    if (this.sub) {
      const nextSubscriptions = this.sub.subscriptions(this.model);
      const nextSubscriptionMap: {
        [id: string]: Subscription<SubscriptionType>;
      } = {};

      for (const subscription of nextSubscriptions) {
        nextSubscriptionMap[subscription.id] = subscription;
        if (!this.currentSubscriptions[subscription.id]) {
          this.sub.subscriptionManager[subscription.id].subscribe(
            this.dispatch.bind(this),
          );
          this.currentSubscriptions[subscription.id] = subscription;
        }
      }

      for (const id in this.currentSubscriptions) {
        if (!nextSubscriptionMap[id]) {
          this.sub.subscriptionManager[id].unsubscribe();
          delete this.currentSubscriptions[id];
        }
      }
    }
  }

  dispatch(msg: Msg) {
    const [model, thunk] = this.update(msg, this.model);
    this.model = model;
    this.root.render(this.view(this.model, this.dispatch.bind(this)));

    this.updateSubscriptions();

    if (thunk) {
      // purposefully do not await.
      thunk(this.dispatch.bind(this));
    }
  }
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
