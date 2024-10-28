import {
  init,
  eventListenersModule,
  propsModule,
  classModule,
  styleModule,
} from "snabbdom";

export const patch = init([
  eventListenersModule,
  propsModule,
  classModule,
  styleModule,
]);
