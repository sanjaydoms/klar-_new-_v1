export * from "./types";
export { bookingSupplierRegistry } from "./registry";

// Registration order matters: resolve() takes the FIRST supplier whose owns()
// returns true, and rategain's is a catch-all that always matches. Any supplier
// with a specific predicate must be imported before it.
import "./tripjack";
import "./rategain";
