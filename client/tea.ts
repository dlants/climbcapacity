import { VNode } from "snabbdom";
import { patch } from "./snabbdom-init";

export type Update<Msg, Model> = (
  msg: Msg,
  model: Model,
) => [Model] | [Model, Thunk<Msg> | undefined];
export type View<Msg, Model> = (
  model: Model,
  dispatch: (msg: Msg) => void,
) => VNode;
export type Dispatch<Msg> = (msg: Msg) => void;

export class App<Model, Msg> {
  private model: Model;
  private vnode: VNode;
  private update: Update<Msg, Model>;
  private view: View<Msg, Model>;

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
    this.vnode = view(this.model, this.dispatch.bind(this));
    patch(element, this.vnode);
  }

  dispatch(msg: Msg) {
    const [model, thunk] = this.update(msg, this.model);
    this.model = model;

    const newVnode = this.view(this.model, this.dispatch.bind(this));
    this.vnode = patch(this.vnode, newVnode);

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
