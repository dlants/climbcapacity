import * as DCGView from "dcgview";
import { Identifier }
  from "../../parser/types";
import { InitialFilter, UnitType } from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";
import * as Filter from "../filters/filter";
import { MeasureId } from "../../../iso/measures";
import { Dispatch } from "../../types";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";

export class ReportCardFilterView extends DCGView.View<{
  controller: () => ReportCardFilterController;
}> {
  template() {
    const { For } = DCGView.Components;
    const stateProp = () => this.props.controller().state;

    return (
      <div>
        <For each={() => stateProp().filters} key={(filter: ToggleableFilter) => this.props.controller().getMeasureId(filter.filter)}>
          {(filterProp: () => ToggleableFilter) => this.renderFilterView(filterProp)}
        </For>
      </div>
    );
  }

  private renderFilterView(filterProp: () => ToggleableFilter) {
    const measureId = () => this.props.controller().getMeasureId(filterProp().filter);

    return (
      <div class={DCGView.const(styles.filterView)}>
        <div class={DCGView.const(styles.filterItem)}>
          <input
            type={DCGView.const("checkbox")}
            checked={() => filterProp().enabled}
            onChange={(e) =>
              this.props.controller().context.myDispatch({
                type: "TOGGLE_FILTER",
                measureId: measureId(),
                enabled: (e.target as HTMLInputElement).checked,
              })
            }
          />
        </div>
        <div class={DCGView.const(styles.filterItem)}>
          <strong>{() => measureId()}</strong>{" "}
        </div>
        <div class={DCGView.const(styles.filterItem)}>
          <Filter.FilterView controller={() => filterProp().filter} />
        </div>
      </div>
    );
  }
}

export type ToggleableFilter = {
  enabled: boolean;
  filter: Filter.FilterController;
};

export type FilterMapping = {
  [id: Identifier]: {
    measureId: MeasureId;
    unit: UnitType;
  };
};

export type Model = {
  measureStats: MeasureStats;
  filters: ToggleableFilter[];
};

export type Msg =
  | { type: "TOGGLE_FILTER"; measureId: MeasureId; enabled: boolean }
  | { type: "FILTER_MSG"; measureId: MeasureId; msg: Filter.Msg };

export type InitialFilters = {
  [measureId: MeasureId]: InitialFilter & { enabled: boolean };
};

export class ReportCardFilterController {
  state: Model;

  constructor(
    initialParams: {
      initialFilters: InitialFilters;
      measureStats: MeasureStats;
    },
    public context: { myDispatch: Dispatch<Msg> }
  ) {
    const filters: ToggleableFilter[] = [];
    for (const measureIdStr in initialParams.initialFilters) {
      const measureId = measureIdStr as MeasureId;
      const initialFilter = initialParams.initialFilters[measureId];
      filters.push({
        enabled: initialFilter.enabled,
        filter: new Filter.FilterController(
          { measureId, initialFilter },
          { myDispatch: (msg: Filter.Msg) => this.context.myDispatch({ type: "FILTER_MSG", measureId, msg }) }
        ),
      });
    }
    this.state = { measureStats: initialParams.measureStats, filters };
  }

  getMeasureId(filter: Filter.FilterController): MeasureId {
    switch (filter.state.type) {
      case "minmax": {
        return filter.state.controller.state.measureId;
      }
      case "toggle": {
        return filter.state.controller.state.measureId;
      }
      default:
        assertUnreachable(filter.state);
    }
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "TOGGLE_FILTER": {
        const toggleFilter = this.state.filters.find(
          (f) => this.getMeasureId(f.filter) === msg.measureId,
        );
        if (!toggleFilter) {
          throw new Error(`Filter not found for measureId ${msg.measureId}`);
        } else {
          toggleFilter.enabled = msg.enabled;
        }
        break;
      }
      case "FILTER_MSG": {
        const msgFilter = this.state.filters.find(
          (f) => this.getMeasureId(f.filter) === msg.measureId,
        );
        if (!msgFilter) {
          throw new Error(`Filter not found for measureId ${msg.measureId}`);
        }

        msgFilter.filter.handleDispatch(msg.msg);
        break;
      }
      default:
        assertUnreachable(msg);
    }
  }
  // Legacy view method for backward compatibility
  view() {
    const view = new ReportCardFilterView({ controller: () => this });
    return view.template();
  }

}

const styles = typestyle.stylesheet({
  filterView: {
    width: csx.percent(100),
    margin: "10px 0",
    gap: "8px",
    $nest: {
      "@media (min-width: 800px)": {
        ...csstips.horizontal,
        ...csstips.wrap,
      },
      "@media (max-width: 800px)": {
        ...csstips.vertical,
      },
    },
  },
  filterItem: {
    ...csstips.content,
    maxWidth: csx.percent(100),
  },
});
