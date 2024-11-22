import React from "react";
import * as immer from "immer";

const produce = immer.produce;
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";
import {
  MAXHANG_EDGE_SIZE,
  MaxHangEdgeSize,
  CONTINUOUS_HANG,
  ContinuousHangGrip,
  generateContinuousHangId,
  parseContinuousHangId,
} from "../../../../iso/measures/fingers";

export type Model = {
  grip: ContinuousHangGrip;
  measureId: MeasureId;
  edgeSize: MaxHangEdgeSize;
};

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    const { gripType } = parseContinuousHangId(measureId);
    return {
      grip: gripType,
      measureId,
      edgeSize: MAXHANG_EDGE_SIZE[0],
    };
  } else {
    return {
      grip: CONTINUOUS_HANG[0],
      edgeSize: MAXHANG_EDGE_SIZE[0],
      measureId: generateContinuousHangId({
        edgeSize: MAXHANG_EDGE_SIZE[0],
        gripType: CONTINUOUS_HANG[0],
      }),
    };
  }
};

export type Msg =
  | { type: "SET_GRIP"; gripType: ContinuousHangGrip }
  | { type: "SET_EDGE_SIZE"; edgeSize: MaxHangEdgeSize };

export const update = (msg: Msg, model: Model): [Model] => {
  return [
    produce(model, (draft) => {
      switch (msg.type) {
        case "SET_GRIP":
          draft.grip = msg.gripType;
          draft.measureId = generateContinuousHangId({
            edgeSize: draft.edgeSize,
            gripType: draft.grip,
          });
          break;
        case "SET_EDGE_SIZE":
          draft.edgeSize = msg.edgeSize;
          draft.measureId = generateContinuousHangId({
            edgeSize: draft.edgeSize,
            gripType: draft.grip,
          });
          break;
        default:
          assertUnreachable(msg);
      }
    }),
  ];
};

export const view = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => {
  return (
    <div>
      <select
        value={model.grip}
        onChange={(e) =>
          dispatch({
            type: "SET_GRIP",
            gripType: e.target.value as ContinuousHangGrip,
          })
        }
      >
        {CONTINUOUS_HANG.map((grip) => (
          <option key={grip} value={grip}>
            {grip}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={model.edgeSize}
        onChange={(e) =>
          dispatch({
            type: "SET_EDGE_SIZE",
            edgeSize: parseInt(e.target.value, 10) as MaxHangEdgeSize,
          })
        }
      />
    </div>
  );
};
