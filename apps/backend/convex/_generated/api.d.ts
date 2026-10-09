/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as alerts from "../alerts.js";
import type * as alertsPush from "../alertsPush.js";
import type * as analytics from "../analytics.js";
import type * as connections from "../connections.js";
import type * as crons from "../crons.js";
import type * as deletion from "../deletion.js";
import type * as devSeed from "../devSeed.js";
import type * as feedback from "../feedback.js";
import type * as heroes from "../heroes.js";
import type * as http from "../http.js";
import type * as incidents from "../incidents.js";
import type * as inventory from "../inventory.js";
import type * as keepsakes from "../keepsakes.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib_achievements from "../lib/achievements.js";
import type * as lib_adminAccess from "../lib/adminAccess.js";
import type * as lib_alerts from "../lib/alerts.js";
import type * as lib_deletionConfirmation from "../lib/deletionConfirmation.js";
import type * as lib_engine_deskCrawler from "../lib/engine/deskCrawler.js";
import type * as lib_engine_publication from "../lib/engine/publication.js";
import type * as lib_engine_runner from "../lib/engine/runner.js";
import type * as lib_engine_runtime from "../lib/engine/runtime.js";
import type * as lib_engine_scores from "../lib/engine/scores.js";
import type * as lib_engine_tables from "../lib/engine/tables.js";
import type * as lib_engine_world from "../lib/engine/world.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_gameHooks from "../lib/gameHooks.js";
import type * as lib_gameProfile from "../lib/gameProfile.js";
import type * as lib_hash from "../lib/hash.js";
import type * as lib_intent from "../lib/intent.js";
import type * as lib_keepsakes from "../lib/keepsakes.js";
import type * as lib_logDetail from "../lib/logDetail.js";
import type * as lib_names from "../lib/names.js";
import type * as lib_raids from "../lib/raids.js";
import type * as lib_rankingRead from "../lib/rankingRead.js";
import type * as lib_svix from "../lib/svix.js";
import type * as lib_trmnlManagement from "../lib/trmnlManagement.js";
import type * as maintenance from "../maintenance.js";
import type * as platform from "../platform.js";
import type * as profiles from "../profiles.js";
import type * as raids from "../raids.js";
import type * as sim_runs_adapter from "../sim/runs/adapter.js";
import type * as sim_runs_tick from "../sim/runs/tick.js";
import type * as slowCast_adapter from "../slowCast/adapter.js";
import type * as slowCast_anglers from "../slowCast/anglers.js";
import type * as slowCast_leaderboard from "../slowCast/leaderboard.js";
import type * as slowCast_lifecycle from "../slowCast/lifecycle.js";
import type * as slowCast_payload from "../slowCast/payload.js";
import type * as slowCast_profile from "../slowCast/profile.js";
import type * as slowCast_runtime from "../slowCast/runtime.js";
import type * as slowCast_tick from "../slowCast/tick.js";
import type * as slowCast_validators from "../slowCast/validators.js";
import type * as trmnl from "../trmnl.js";
import type * as trmnlPayload from "../trmnlPayload.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";
import type * as world from "../world.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  admin: typeof admin;
  alerts: typeof alerts;
  alertsPush: typeof alertsPush;
  analytics: typeof analytics;
  connections: typeof connections;
  crons: typeof crons;
  deletion: typeof deletion;
  devSeed: typeof devSeed;
  feedback: typeof feedback;
  heroes: typeof heroes;
  http: typeof http;
  incidents: typeof incidents;
  inventory: typeof inventory;
  keepsakes: typeof keepsakes;
  leaderboard: typeof leaderboard;
  "lib/achievements": typeof lib_achievements;
  "lib/adminAccess": typeof lib_adminAccess;
  "lib/alerts": typeof lib_alerts;
  "lib/deletionConfirmation": typeof lib_deletionConfirmation;
  "lib/engine/deskCrawler": typeof lib_engine_deskCrawler;
  "lib/engine/publication": typeof lib_engine_publication;
  "lib/engine/runner": typeof lib_engine_runner;
  "lib/engine/runtime": typeof lib_engine_runtime;
  "lib/engine/scores": typeof lib_engine_scores;
  "lib/engine/tables": typeof lib_engine_tables;
  "lib/engine/world": typeof lib_engine_world;
  "lib/errors": typeof lib_errors;
  "lib/gameHooks": typeof lib_gameHooks;
  "lib/gameProfile": typeof lib_gameProfile;
  "lib/hash": typeof lib_hash;
  "lib/intent": typeof lib_intent;
  "lib/keepsakes": typeof lib_keepsakes;
  "lib/logDetail": typeof lib_logDetail;
  "lib/names": typeof lib_names;
  "lib/raids": typeof lib_raids;
  "lib/rankingRead": typeof lib_rankingRead;
  "lib/svix": typeof lib_svix;
  "lib/trmnlManagement": typeof lib_trmnlManagement;
  maintenance: typeof maintenance;
  platform: typeof platform;
  profiles: typeof profiles;
  raids: typeof raids;
  "sim/runs/adapter": typeof sim_runs_adapter;
  "sim/runs/tick": typeof sim_runs_tick;
  "slowCast/adapter": typeof slowCast_adapter;
  "slowCast/anglers": typeof slowCast_anglers;
  "slowCast/leaderboard": typeof slowCast_leaderboard;
  "slowCast/lifecycle": typeof slowCast_lifecycle;
  "slowCast/payload": typeof slowCast_payload;
  "slowCast/profile": typeof slowCast_profile;
  "slowCast/runtime": typeof slowCast_runtime;
  "slowCast/tick": typeof slowCast_tick;
  "slowCast/validators": typeof slowCast_validators;
  trmnl: typeof trmnl;
  trmnlPayload: typeof trmnlPayload;
  users: typeof users;
  waitlist: typeof waitlist;
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
