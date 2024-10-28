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

export class App<Model, Msg> {
  private model: Model;
  private update: Update<Msg, Model>;
  private view: View<Msg, Model>;
  private root: Root;

  constructor({
    initialModel,
    update,
    view,
    element,
  }: {
    initialModel: Model;
    update: Update<Msg, Model>;
    view: View<Msg, Model>;
    element: Element;
  }) {
    this.update = update;
    this.model = initialModel;
    this.view = view;
    this.root = createRoot(element);
    this.root.render(view(this.model, this.dispatch.bind(this)));
  }

  dispatch(msg: Msg) {
    const [model, thunk] = this.update(msg, this.model);
    this.model = model;
    this.root.render(this.view(this.model, this.dispatch.bind(this)));

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
