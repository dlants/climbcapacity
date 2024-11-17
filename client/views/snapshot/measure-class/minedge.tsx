import React from "react";
import {
  MAXHANG_DURATION,
  MaxHangDuration,
  parseMinEdgeHangId,
  MIN_EDGE_GRIPS,
  generateMinEdgeHangId,
  MinEdgeGrip,
} from "../../../../iso/measures/fingers";
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";

export type Model = {
  gripType: MinEdgeGrip;
  duration: MaxHangDuration;
  measureId: MeasureId;
};

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    const { gripType, duration } = parseMinEdgeHangId(measureId);
    return {
      gripType,
      duration,
      measureId,
    };
  } else {
    return {
      gripType: MIN_EDGE_GRIPS[0],
      duration: MAXHANG_DURATION[0],
      measureId: generateMinEdgeHangId({
        gripType: MIN_EDGE_GRIPS[0],
        duration: MAXHANG_DURATION[0],
      }),
    };
  }
};

export type Msg =
  | { type: "SET_GRIP_TYPE"; gripType: MinEdgeGrip }
  | { type: "SET_DURATION"; duration: MaxHangDuration };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "SET_GRIP_TYPE":
      return [
        {
          ...model,
          gripType: msg.gripType,
          measureId: generateMinEdgeHangId({
            gripType: msg.gripType,
            duration: model.duration,
          }),
        },
      ];

    case "SET_DURATION":
      return [
        {
          ...model,
          duration: msg.duration,
          measureId: generateMinEdgeHangId({
            duration: msg.duration,
            gripType: model.gripType,
          }),
        },
      ];

    default:
      assertUnreachable(msg);
  }
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
        onChange={(e) =>
          dispatch({
            type: "SET_GRIP_TYPE",
            gripType: e.target.value as MinEdgeGrip,
          })
        }
        value={model.gripType}
      >
        {MIN_EDGE_GRIPS.map((grip) => (
          <option key={grip} value={grip}>
            {grip}
          </option>
        ))}
      </select>

      <select
        onChange={(e) =>
          dispatch({
            type: "SET_DURATION",
            duration: parseInt(e.target.value) as MaxHangDuration,
          })
        }
        value={model.duration}
      >
        {MAXHANG_DURATION.map((duration) => (
          <option key={duration} value={duration}>
            {duration}s
          </option>
        ))}
      </select>
    </div>
  );
};
