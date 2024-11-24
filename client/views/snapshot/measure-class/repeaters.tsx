import React from "react";
import * as immer from "immer";

const produce = immer.produce;
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";
import {
  MAXHANG_EDGE_SIZE,
  MaxHangEdgeSize,
  REPEATERS_GRIPS,
  RepeatersGrip,
  generateRepeaterId,
  parseRepeaterId,
} from "../../../../iso/measures/fingers";

export type Model = {
  grip: RepeatersGrip;
  measureId: MeasureId;
  edgeSize: MaxHangEdgeSize;
};

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    const { gripType } = parseRepeaterId(measureId);
    return {
      grip: gripType,
      measureId,
      edgeSize: MAXHANG_EDGE_SIZE[0],
    };
  } else {
    return {
      grip: REPEATERS_GRIPS[0],
      edgeSize: MAXHANG_EDGE_SIZE[0],
      measureId: generateRepeaterId({
        edgeSize: MAXHANG_EDGE_SIZE[0],
        gripType: REPEATERS_GRIPS[0],
      }),
    };
  }
};

export type Msg =
  | { type: "SET_GRIP"; gripType: RepeatersGrip }
  | { type: "SET_EDGE_SIZE"; edgeSize: MaxHangEdgeSize };

export const update = (msg: Msg, model: Model): [Model] => {
  return [
    produce(model, (draft) => {
      switch (msg.type) {
        case "SET_GRIP":
          draft.grip = msg.gripType;
          draft.measureId = generateRepeaterId({
            edgeSize: draft.edgeSize,
            gripType: draft.grip,
          });
          break;
        case "SET_EDGE_SIZE":
          draft.edgeSize = msg.edgeSize;
          draft.measureId = generateRepeaterId({
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
            gripType: e.target.value as RepeatersGrip,
          })
        }
      >
        {REPEATERS_GRIPS.map((grip) => (
          <option key={grip} value={grip}>
            {grip}
          </option>
        ))}
      </select>
      <select
        value={model.edgeSize}
        onChange={(e) =>
          dispatch({
            type: "SET_EDGE_SIZE",
            edgeSize: parseInt(e.target.value, 10) as MaxHangEdgeSize,
          })
        }
      >
        {MAXHANG_EDGE_SIZE.map((size) => (
          <option key={size} value={size}>
            {size}mm
          </option>
        ))}
      </select>
    </div>
  );
};
