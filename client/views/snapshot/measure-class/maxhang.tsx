import React from "react";
import {
  generateMaxhangId,
  parseMaxhangId,
  MAXHANG_DURATION,
  MAXHANG_EDGE_SIZE,
  MAXHANG_GRIP_TYPE,
  MaxHangDuration,
  MaxHangEdgeSize,
  MaxHangGripType,
} from "../../../../iso/measures/fingers";
import { MeasureId } from "../../../../iso/measures";

export type Model = {
  gripType: MaxHangGripType;
  edgeSize: MaxHangEdgeSize;
  duration: MaxHangDuration;
  measureId: MeasureId;
};

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    const { gripType, edgeSize, duration } = parseMaxhangId(measureId);
    return {
      gripType,
      edgeSize,
      duration,
      measureId,
    };
  } else {
    return {
      gripType: MAXHANG_GRIP_TYPE[0],
      edgeSize: MAXHANG_EDGE_SIZE[0],
      duration: MAXHANG_DURATION[0],
      measureId: generateMaxhangId({
        gripType: MAXHANG_GRIP_TYPE[0],
        edgeSize: MAXHANG_EDGE_SIZE[0],
        duration: MAXHANG_DURATION[0],
      }),
    };
  }
};

export type Msg =
  | { type: "SET_GRIP_TYPE"; gripType: MaxHangGripType }
  | { type: "SET_EDGE_SIZE"; edgeSize: MaxHangEdgeSize }
  | { type: "SET_DURATION"; duration: MaxHangDuration };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "SET_GRIP_TYPE":
      return [
        {
          ...model,
          gripType: msg.gripType,
          measureId: generateMaxhangId({
            edgeSize: model.edgeSize,
            duration: model.duration,
            gripType: msg.gripType,
          }),
        },
      ];

    case "SET_EDGE_SIZE":
      return [
        {
          ...model,
          edgeSize: msg.edgeSize,
          measureId: generateMaxhangId({
            edgeSize: msg.edgeSize,
            duration: model.duration,
            gripType: model.gripType,
          }),
        },
      ];

    case "SET_DURATION":
      return [
        {
          ...model,
          duration: msg.duration,
          measureId: generateMaxhangId({
            edgeSize: model.edgeSize,
            duration: msg.duration,
            gripType: model.gripType,
          }),
        },
      ];
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
            gripType: e.target.value as MaxHangGripType,
          })
        }
        value={model.gripType}
      >
        {MAXHANG_GRIP_TYPE.map((grip) => (
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
    </div>
  );
};
