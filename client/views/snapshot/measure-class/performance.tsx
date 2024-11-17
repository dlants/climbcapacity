import React from "react";
import * as immer from "immer";

const produce = immer.produce;
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";
import {
  BOULDER_LOCATION,
  BoulderLocation,
  Context,
  generateGradeMeasureId,
  parseGradeMeasureId,
  SPORT_LOCATION,
  SportLocation,
  STAT,
  Stat,
} from "../../../../iso/measures/grades";

export type Model = {
  context: Context;
  stat: Stat;
  measureId: MeasureId;
};

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    const { context, stat } = parseGradeMeasureId(measureId);
    return {
      context,
      stat,
      measureId,
    };
  } else {
    return {
      context: {
        type: "boulder",
        location: BOULDER_LOCATION[0],
      },
      stat: STAT[0],
      measureId: generateGradeMeasureId({
        context: {
          type: "boulder",
          location: BOULDER_LOCATION[0],
        },
        stat: STAT[0],
      }),
    };
  }
};

export type Msg =
  | { type: "SET_CONTEXT_TYPE"; contextType: Context["type"] }
  | { type: "SET_CONTEXT_LOCATION"; location: BoulderLocation | SportLocation }
  | { type: "SET_STAT"; stat: Stat };

export const update = (msg: Msg, model: Model): [Model] => {
  return [
    produce(model, (draft) => {
      switch (msg.type) {
        case "SET_CONTEXT_TYPE":
          draft.context.type = msg.contextType;
          if (
            (msg.contextType === "boulder" &&
              !BOULDER_LOCATION.includes(
                draft.context.location as BoulderLocation,
              )) ||
            (msg.contextType === "sport" &&
              !SPORT_LOCATION.includes(draft.context.location as SportLocation))
          ) {
            draft.context.location =
              msg.contextType === "boulder"
                ? BOULDER_LOCATION[0]
                : SPORT_LOCATION[0];
          }
          draft.measureId = generateGradeMeasureId(draft);
          break;
        case "SET_CONTEXT_LOCATION":
          if (
            (draft.context.type === "boulder" &&
              BOULDER_LOCATION.includes(msg.location as BoulderLocation)) ||
            (draft.context.type === "sport" &&
              SPORT_LOCATION.includes(msg.location as SportLocation))
          ) {
            draft.context.location = msg.location;
          }
          draft.measureId = generateGradeMeasureId(draft);
          break;
        case "SET_STAT":
          draft.stat = msg.stat;
          draft.measureId = generateGradeMeasureId(draft);
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
        value={model.context.type}
        onChange={(e) =>
          dispatch({
            type: "SET_CONTEXT_TYPE",
            contextType: e.target.value as Context["type"],
          })
        }
      >
        <option value="boulder">Boulder</option>
        <option value="sport">Sport</option>
      </select>

      <select
        value={model.context.location}
        onChange={(e) =>
          dispatch({
            type: "SET_CONTEXT_LOCATION",
            location: e.target.value as BoulderLocation | SportLocation,
          })
        }
      >
        {(model.context.type === "boulder"
          ? BOULDER_LOCATION
          : SPORT_LOCATION
        ).map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>

      <select
        value={model.stat}
        onChange={(e) =>
          dispatch({ type: "SET_STAT", stat: e.target.value as Stat })
        }
      >
        {STAT.map((stat) => (
          <option key={stat} value={stat}>
            {stat}
          </option>
        ))}
      </select>
    </div>
  );
};
