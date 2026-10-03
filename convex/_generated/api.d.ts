/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as art_canvas from "../art/canvas.js";
import type * as art_hero from "../art/hero.js";
import type * as art_monsters from "../art/monsters.js";
import type * as art_png from "../art/png.js";
import type * as art_props from "../art/props.js";
import type * as art_route from "../art/route.js";
import type * as art_scene from "../art/scene.js";
import type * as art_sceneKey from "../art/sceneKey.js";
import type * as connections from "../connections.js";
import type * as content_index from "../content/index.js";
import type * as content_v1 from "../content/v1.js";
import type * as content_v2 from "../content/v2.js";
import type * as content_validate from "../content/validate.js";
import type * as crons from "../crons.js";
import type * as deletion from "../deletion.js";
import type * as devSeed from "../devSeed.js";
import type * as heroes from "../heroes.js";
import type * as http from "../http.js";
import type * as incidents from "../incidents.js";
import type * as inventory from "../inventory.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_hash from "../lib/hash.js";
import type * as lib_intent from "../lib/intent.js";
import type * as lib_logDetail from "../lib/logDetail.js";
import type * as lib_names from "../lib/names.js";
import type * as lib_payload from "../lib/payload.js";
import type * as lib_rankingRead from "../lib/rankingRead.js";
import type * as maintenance from "../maintenance.js";
import type * as sim_core_apply from "../sim/core/apply.js";
import type * as sim_core_index from "../sim/core/index.js";
import type * as sim_core_invariants from "../sim/core/invariants.js";
import type * as sim_core_narrative from "../sim/core/narrative.js";
import type * as sim_core_rng from "../sim/core/rng.js";
import type * as sim_core_simulate from "../sim/core/simulate.js";
import type * as sim_core_starter from "../sim/core/starter.js";
import type * as sim_core_stats from "../sim/core/stats.js";
import type * as sim_core_types from "../sim/core/types.js";
import type * as sim_runs_adapter from "../sim/runs/adapter.js";
import type * as sim_runs_tick from "../sim/runs/tick.js";
import type * as sim_score from "../sim/score.js";
import type * as sim_seed from "../sim/seed.js";
import type * as templates_screen from "../templates/screen.js";
import type * as trmnl from "../trmnl.js";
import type * as trmnlPayload from "../trmnlPayload.js";
import type * as users from "../users.js";
import type * as world from "../world.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "art/canvas": typeof art_canvas;
  "art/hero": typeof art_hero;
  "art/monsters": typeof art_monsters;
  "art/png": typeof art_png;
  "art/props": typeof art_props;
  "art/route": typeof art_route;
  "art/scene": typeof art_scene;
  "art/sceneKey": typeof art_sceneKey;
  connections: typeof connections;
  "content/index": typeof content_index;
  "content/v1": typeof content_v1;
  "content/v2": typeof content_v2;
  "content/validate": typeof content_validate;
  crons: typeof crons;
  deletion: typeof deletion;
  devSeed: typeof devSeed;
  heroes: typeof heroes;
  http: typeof http;
  incidents: typeof incidents;
  inventory: typeof inventory;
  leaderboard: typeof leaderboard;
  "lib/errors": typeof lib_errors;
  "lib/hash": typeof lib_hash;
  "lib/intent": typeof lib_intent;
  "lib/logDetail": typeof lib_logDetail;
  "lib/names": typeof lib_names;
  "lib/payload": typeof lib_payload;
  "lib/rankingRead": typeof lib_rankingRead;
  maintenance: typeof maintenance;
  "sim/core/apply": typeof sim_core_apply;
  "sim/core/index": typeof sim_core_index;
  "sim/core/invariants": typeof sim_core_invariants;
  "sim/core/narrative": typeof sim_core_narrative;
  "sim/core/rng": typeof sim_core_rng;
  "sim/core/simulate": typeof sim_core_simulate;
  "sim/core/starter": typeof sim_core_starter;
  "sim/core/stats": typeof sim_core_stats;
  "sim/core/types": typeof sim_core_types;
  "sim/runs/adapter": typeof sim_runs_adapter;
  "sim/runs/tick": typeof sim_runs_tick;
  "sim/score": typeof sim_score;
  "sim/seed": typeof sim_seed;
  "templates/screen": typeof templates_screen;
  trmnl: typeof trmnl;
  trmnlPayload: typeof trmnlPayload;
  users: typeof users;
  world: typeof world;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
