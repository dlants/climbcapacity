import React from "react";
import {
  generateMinEdgePullupId,
  parseMinEdgePullupId,
  MinEdgePullupGrip,
  MINEDGE_PULLUP_GRIPS,
} from "../../../../iso/measures/fingers";
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";

export type Model = {
  gripType: MinEdgePullupGrip;
  measureId: MeasureId;
};

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    const { gripType } = parseMinEdgePullupId(measureId);
    return {
      gripType,
      measureId,
    };
  } else {
    return {
      gripType: MINEDGE_PULLUP_GRIPS[0],
      measureId: generateMinEdgePullupId({
        gripType: MINEDGE_PULLUP_GRIPS[0],
      }),
    };
  }
};

export type Msg = { type: "SET_GRIP_TYPE"; gripType: MinEdgePullupGrip };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "SET_GRIP_TYPE":
      return [
        {
          ...model,
          gripType: msg.gripType,
          measureId: generateMinEdgePullupId({
            gripType: msg.gripType,
          }),
        },
      ];

    default:
      assertUnreachable(msg.type);
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
            gripType: e.target.value as MinEdgePullupGrip,
          })
        }
        value={model.gripType}
      >
        {MINEDGE_PULLUP_GRIPS.map((grip) => (
          <option key={grip} value={grip}>
            {grip}
          </option>
        ))}
      </select>
    </div>
  );
};
