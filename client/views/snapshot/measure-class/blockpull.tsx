import { DOMINANT_SIDE, DominantSide } from "../../../../iso/measures/movement";
import React from "react";
import {
  MAXHANG_DURATION,
  MAXHANG_EDGE_SIZE,
  GRIPS,
  MaxHangDuration,
  MaxHangEdgeSize,
  Grip,
  generateBlockPullId,
  parseBlockPullId,
} from "../../../../iso/measures/fingers";
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";

export type Model = {
  gripType: Grip;
  edgeSize: MaxHangEdgeSize;
  duration: MaxHangDuration;
  dominantSide: DominantSide;
  measureId: MeasureId;
};

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    const { gripType, edgeSize, duration, dominantSide } =
      parseBlockPullId(measureId);
    return {
      gripType,
      edgeSize,
      duration,
      dominantSide,
      measureId,
    };
  } else {
    return {
      gripType: GRIPS[0],
      edgeSize: MAXHANG_EDGE_SIZE[0],
      duration: MAXHANG_DURATION[0],
      dominantSide: DOMINANT_SIDE[0],
      measureId: generateBlockPullId({
        gripType: GRIPS[0],
        edgeSize: MAXHANG_EDGE_SIZE[0],
        duration: MAXHANG_DURATION[0],
        dominantSide: DOMINANT_SIDE[0],
      }),
    };
  }
};

export type Msg =
  | { type: "SET_GRIP_TYPE"; gripType: Grip }
  | { type: "SET_EDGE_SIZE"; edgeSize: MaxHangEdgeSize }
  | { type: "SET_DURATION"; duration: MaxHangDuration }
  | { type: "SET_DOMINANT_SIDE"; dominantSide: DominantSide };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "SET_GRIP_TYPE":
      return [
        {
          ...model,
          gripType: msg.gripType,
          measureId: generateBlockPullId({
            edgeSize: model.edgeSize,
            duration: model.duration,
            gripType: msg.gripType,
            dominantSide: model.dominantSide,
          }),
        },
      ];

    case "SET_EDGE_SIZE":
      return [
        {
          ...model,
          edgeSize: msg.edgeSize,
          measureId: generateBlockPullId({
            edgeSize: msg.edgeSize,
            duration: model.duration,
            gripType: model.gripType,
            dominantSide: model.dominantSide,
          }),
        },
      ];

    case "SET_DURATION":
      return [
        {
          ...model,
          duration: msg.duration,
          measureId: generateBlockPullId({
            edgeSize: model.edgeSize,
            duration: msg.duration,
            gripType: model.gripType,
            dominantSide: model.dominantSide,
          }),
        },
      ];

    case "SET_DOMINANT_SIDE":
      return [
        {
          ...model,
          dominantSide: msg.dominantSide,
          measureId: generateBlockPullId({
            edgeSize: model.edgeSize,
            duration: model.duration,
            gripType: model.gripType,
            dominantSide: msg.dominantSide,
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
            gripType: e.target.value as Grip,
          })
        }
        value={model.gripType}
      >
        {GRIPS.map((grip) => (
          <option key={grip} value={grip}>
            {grip}
          </option>
        ))}
      </select>

      <select
        onChange={(e) =>
          dispatch({
            type: "SET_EDGE_SIZE",
            edgeSize: parseInt(e.target.value) as MaxHangEdgeSize,
          })
        }
        value={model.edgeSize}
      >
        {MAXHANG_EDGE_SIZE.map((size) => (
          <option key={size} value={size}>
            {size}mm
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

      <select
        onChange={(e) =>
          dispatch({
            type: "SET_DOMINANT_SIDE",
            dominantSide: e.target.value as (typeof DOMINANT_SIDE)[number],
          })
        }
        value={model.dominantSide}
      >
        {DOMINANT_SIDE.map((side) => (
          <option key={side} value={side}>
            {side}
          </option>
        ))}
      </select>
    </div>
  );
};
