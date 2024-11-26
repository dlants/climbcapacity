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
  generateUnilateralMaxhangId,
  parseUnilateralMaxhangId,
} from "../../../../iso/measures/fingers";
import { MeasureId } from "../../../../iso/measures";
import { DOMINANT_SIDE, DominantSide } from "../../../../iso/measures/movement";
import { MeasureStats } from "../../../../iso/protocol";
import { CountTree, getFromCountTree, measureStatsToCountTree } from "./utils";
import { build } from "vite";

export type Model = {
  bilateralCountTree: CountTree;
  unilateralCountTree: CountTree;
  gripType: MaxHangGripType;
  edgeSize: MaxHangEdgeSize;
  duration: MaxHangDuration;
  isUnilateral: boolean;
  dominantSide?: DominantSide;
  measureId: MeasureId;
};

export const initModel = (
  measureStats: MeasureStats,
  measureId?: MeasureId,
): Model => {
  const bilateralPropCounts = measureStatsToCountTree(
    measureStats,
    parseMaxhangId,
    ["gripType", "edgeSize", "duration"],
  );

  const unilateralPropCounts = measureStatsToCountTree(
    measureStats,
    parseUnilateralMaxhangId,
    ["gripType", "edgeSize", "duration", "dominantSide"],
  );

  if (measureId) {
    try {
      const { gripType, edgeSize, duration } = parseMaxhangId(measureId);
      return {
        bilateralCountTree: bilateralPropCounts,
        unilateralCountTree: unilateralPropCounts,
        gripType,
        edgeSize,
        duration,
        isUnilateral: false,
        measureId,
      };
    } catch {
      const { gripType, edgeSize, duration, dominantSide } =
        parseUnilateralMaxhangId(measureId);
      return {
        bilateralCountTree: bilateralPropCounts,
        unilateralCountTree: unilateralPropCounts,
        gripType,
        edgeSize,
        duration,
        isUnilateral: true,
        dominantSide,
        measureId,
      };
    }
  } else {
    return {
      bilateralCountTree: bilateralPropCounts,
      unilateralCountTree: unilateralPropCounts,
      gripType: MAXHANG_GRIP_TYPE[0],
      edgeSize: MAXHANG_EDGE_SIZE[0],
      duration: MAXHANG_DURATION[0],
      isUnilateral: false,
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
  | { type: "SET_DURATION"; duration: MaxHangDuration }
  | { type: "SET_IS_UNILATERAL"; isUnilateral: boolean }
  | { type: "SET_DOMINANT_SIDE"; dominantSide: DominantSide };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "SET_GRIP_TYPE": {
      const measureId = model.isUnilateral
        ? generateUnilateralMaxhangId({
            edgeSize: model.edgeSize,
            duration: model.duration,
            gripType: msg.gripType,
            dominantSide: model.dominantSide!,
          })
        : generateMaxhangId({
            edgeSize: model.edgeSize,
            duration: model.duration,
            gripType: msg.gripType,
          });

      return [{ ...model, gripType: msg.gripType, measureId }];
    }

    case "SET_EDGE_SIZE": {
      const measureId = model.isUnilateral
        ? generateUnilateralMaxhangId({
            edgeSize: msg.edgeSize,
            duration: model.duration,
            gripType: model.gripType,
            dominantSide: model.dominantSide!,
          })
        : generateMaxhangId({
            edgeSize: msg.edgeSize,
            duration: model.duration,
            gripType: model.gripType,
          });

      return [{ ...model, edgeSize: msg.edgeSize, measureId }];
    }

    case "SET_DURATION": {
      const measureId = model.isUnilateral
        ? generateUnilateralMaxhangId({
            edgeSize: model.edgeSize,
            duration: msg.duration,
            gripType: model.gripType,
            dominantSide: model.dominantSide!,
          })
        : generateMaxhangId({
            edgeSize: model.edgeSize,
            duration: msg.duration,
            gripType: model.gripType,
          });

      return [{ ...model, duration: msg.duration, measureId }];
    }

    case "SET_IS_UNILATERAL": {
      if (msg.isUnilateral) {
        const dominantSide = DOMINANT_SIDE[0];
        return [
          {
            ...model,
            isUnilateral: true,
            dominantSide,
            measureId: generateUnilateralMaxhangId({
              edgeSize: model.edgeSize,
              duration: model.duration,
              gripType: model.gripType,
              dominantSide,
            }),
          },
        ];
      } else {
        const { dominantSide: _, ...rest } = model;
        return [
          {
            ...rest,
            isUnilateral: false,
            measureId: generateMaxhangId({
              edgeSize: model.edgeSize,
              duration: model.duration,
              gripType: model.gripType,
            }),
          },
        ];
      }
    }

    case "SET_DOMINANT_SIDE": {
      if (!model.isUnilateral) return [model];

      return [
        {
          ...model,
          dominantSide: msg.dominantSide,
          measureId: generateUnilateralMaxhangId({
            edgeSize: model.edgeSize,
            duration: model.duration,
            gripType: model.gripType,
            dominantSide: msg.dominantSide,
          }),
        },
      ];
    }
  }
};

export const view = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => {
  function getStat(keys: string[]) {
    return model.isUnilateral
      ? getFromCountTree(model.unilateralCountTree, keys)
      : getFromCountTree(model.bilateralCountTree, keys);
  }

  return (
    <div>
      <select
        onChange={(e) =>
          dispatch({
            type: "SET_IS_UNILATERAL",
            isUnilateral: e.target.value === "true",
          })
        }
        value={model.isUnilateral.toString()}
      >
        <option value="false">Bilateral {getStat([])}</option>
        <option value="true">Unilateral {getStat([])}</option>
      </select>

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
            {grip} {getStat([grip])}
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
            {size}mm {getStat([model.gripType, size.toString()])}
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
            {duration}s{" "}
            {getStat([
              model.gripType,
              model.edgeSize.toString(),
              duration.toString(),
            ])}
          </option>
        ))}
      </select>

      {model.isUnilateral && (
        <select
          onChange={(e) =>
            dispatch({
              type: "SET_DOMINANT_SIDE",
              dominantSide: e.target.value as DominantSide,
            })
          }
          value={model.dominantSide}
        >
          {DOMINANT_SIDE.map((side) => (
            <option key={side} value={side}>
              {side}{" "}
              {getStat([
                model.gripType,
                model.edgeSize.toString(),
                model.duration.toString(),
                side,
              ])}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
