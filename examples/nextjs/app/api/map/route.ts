import { maps } from "../../../src/maps";

/*
 * The whole route. `@stillmap/serve` is Web `Request` in, `Response` out, and a
 * Next route handler is the same shape, so there is nothing to adapt.
 *
 * Node runtime, necessarily. resvg is a native addon and fonts are read from
 * disk by path, neither of which an edge isolate can do. Node is the Next
 * default, so there is nothing to declare.
 */
export const GET = maps.fetch;
