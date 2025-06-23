import React, { useCallback } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

export type Update<Msg, Model> = (
  msg: Msg,
  model: Model,
) => Model

export type View<Msg, Model> = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => JSX.Element;

export type Dispatch<Msg> = (msg: Msg) => void;

type AppState<Model> =
  | {
    status: "running";
    model: Model;
  }
  | {
    status: "error";
    error: string;
  };

export function createApp<Model, Msg>({
  initialModel,
  update,
  View,
}: {
  initialModel: Model;
  update: Update<Msg, Model>;
  View: View<Msg, Model>;
}) {
  let dispatchRef: { current: Dispatch<Msg> | undefined } = {
    current: undefined,
  };

  function App() {
    const [appState, setModel] = React.useState<AppState<Model>>({
      status: "running",
      model: initialModel,
    });

    const dispatch = useCallback((msg: Msg) => {
      setModel((currentState) => {
        if (currentState.status == "error") {
          return currentState;
        }

        try {
          const nextModel = update(msg, currentState.model);
          return { status: "running", model: nextModel };
        } catch (e) {
          console.error(e);
          return { status: "error", error: (e as Error).message };
        }
      });
    }, []);

    dispatchRef.current = dispatch;

    return (
      <div>
        {appState.status == "running" ? (
          <View model={appState.model} dispatch={dispatch} />
        ) : (
          <div>Error: {appState.error}</div>
        )}
      </div>
    );
  }

  return {
    mount(element: Element) {
      const root = createRoot(element);
      flushSync(() => root.render(<App />));
      return { root, dispatchRef };
    },
  };
}
