/**
 * Event decoders and parsing utilities for Very-Prince PayoutRegistry events.
 *
 * All event names and data tuples are derived from packages/contracts/src/lib.rs.
 */

import { scValToNative, xdr } from "@stellar/stellar-sdk";

export interface BaseEventMeta {
  ledger?: number;
  ledgerClosedAt?: string;
  contractId?: string;
  id?: string;
  pagingToken?: string;
}

export interface OrgRegisteredEvent extends BaseEventMeta {
  type: "org_registered";
  orgId: string;
  admin: string;
}

export interface OrgMetadataUpdatedEvent extends BaseEventMeta {
  type: "OrgMetadataUpdated";
  orgId: string;
  metadataCid: string;
}

export interface OrgFundedEvent extends BaseEventMeta {
  type: "OrgFunded";
  orgId: string;
  from: string;
  amount: bigint;
}

export interface AdminAddedEvent extends BaseEventMeta {
  type: "AdminAdded";
  orgId: string;
  newAdmin: string;
}

export interface AdminRemovedEvent extends BaseEventMeta {
  type: "AdminRemoved";
  orgId: string;
  adminToRemove: string;
}

export interface MaintainerAddedEvent extends BaseEventMeta {
  type: "MaintainerAdded";
  orgId: string;
  maintainer: string;
}

export interface PayoutAllocatedEvent extends BaseEventMeta {
  type: "PayoutAllocated";
  orgId: string;
  maintainer: string;
  amount: bigint;
}

export interface BatchAllocatedEvent extends BaseEventMeta {
  type: "batch_alc";
  orgId: string;
  admin: string;
  total: bigint;
}

export interface PayoutClaimedEvent extends BaseEventMeta {
  type: "PayoutClaimed";
  maintainer: string;
  amount: bigint;
}

export interface RawContractEvent extends BaseEventMeta {
  type: "unknown";
  rawTopics: any[];
  rawValue: any;
}

export type PrinceEvent =
  | OrgRegisteredEvent
  | OrgMetadataUpdatedEvent
  | OrgFundedEvent
  | AdminAddedEvent
  | AdminRemovedEvent
  | MaintainerAddedEvent
  | PayoutAllocatedEvent
  | BatchAllocatedEvent
  | PayoutClaimedEvent
  | RawContractEvent;

/**
 * Normalizes an ScVal, Base64 string, or native value into native JS/TS.
 */
function normalizeVal(val: any): any {
  if (val === undefined || val === null) {
    return val;
  }
  if (typeof val === "object" && typeof val.toXDR === "function") {
    try {
      return scValToNative(val);
    } catch {
      return val;
    }
  }
  if (typeof val === "string") {
    try {
      const parsed = xdr.ScVal.fromXDR(val, "base64");
      return scValToNative(parsed);
    } catch {
      return val;
    }
  }
  if (typeof val === "object" && "xdr" in val && typeof val.xdr === "string") {
    try {
      const parsed = xdr.ScVal.fromXDR(val.xdr, "base64");
      return scValToNative(parsed);
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Parses an individual event returned by Soroban RPC into a typed PrinceEvent.
 */
export function parseEvent(event: any): PrinceEvent {
  const meta: BaseEventMeta = {
    ledger: event.ledger,
    ledgerClosedAt: event.ledgerClosedAt,
    contractId: event.contractId,
    id: event.id,
    pagingToken: event.pagingToken,
  };

  const rawTopics = Array.isArray(event.topic)
    ? event.topic.map(normalizeVal)
    : Array.isArray(event.topics)
      ? event.topics.map(normalizeVal)
      : [];

  const rawVal = normalizeVal(event.value);

  const topic0 = String(rawTopics[0] ?? "");
  const topic1 = String(rawTopics[1] ?? "");

  // Match: ("VeryPrince", "org_registered")
  if (topic0 === "VeryPrince" && topic1 === "org_registered") {
    const data = Array.isArray(rawVal) ? rawVal : [];
    return {
      type: "org_registered",
      ...meta,
      orgId: String(data[0] ?? ""),
      admin: String(data[1] ?? ""),
    };
  }

  // Match: ("VeryPrince", "OrgMetadataUpdated")
  if (topic0 === "VeryPrince" && topic1 === "OrgMetadataUpdated") {
    const data = Array.isArray(rawVal) ? rawVal : [];
    return {
      type: "OrgMetadataUpdated",
      ...meta,
      orgId: String(data[0] ?? ""),
      metadataCid: String(data[1] ?? ""),
    };
  }

  // Match: ("VeryPrince", "OrgFunded")
  if (topic0 === "VeryPrince" && topic1 === "OrgFunded") {
    const data = Array.isArray(rawVal) ? rawVal : [];
    return {
      type: "OrgFunded",
      ...meta,
      orgId: String(data[0] ?? ""),
      from: String(data[1] ?? ""),
      amount: BigInt(data[2] ?? 0n),
    };
  }

  // Match: ("VeryPrince", "AdminAdded")
  if (topic0 === "VeryPrince" && topic1 === "AdminAdded") {
    const data = Array.isArray(rawVal) ? rawVal : [];
    return {
      type: "AdminAdded",
      ...meta,
      orgId: String(data[0] ?? ""),
      newAdmin: String(data[1] ?? ""),
    };
  }

  // Match: ("VeryPrince", "AdminRemoved")
  if (topic0 === "VeryPrince" && topic1 === "AdminRemoved") {
    const data = Array.isArray(rawVal) ? rawVal : [];
    return {
      type: "AdminRemoved",
      ...meta,
      orgId: String(data[0] ?? ""),
      adminToRemove: String(data[1] ?? ""),
    };
  }

  // Match: ("VeryPrince", "MaintainerAdded")
  if (topic0 === "VeryPrince" && topic1 === "MaintainerAdded") {
    const data = Array.isArray(rawVal) ? rawVal : [];
    return {
      type: "MaintainerAdded",
      ...meta,
      orgId: String(data[0] ?? ""),
      maintainer: String(data[1] ?? ""),
    };
  }

  // Match: ("VeryPrince", "PayoutAllocated")
  if (topic0 === "VeryPrince" && topic1 === "PayoutAllocated") {
    const data = Array.isArray(rawVal) ? rawVal : [];
    return {
      type: "PayoutAllocated",
      ...meta,
      orgId: String(data[0] ?? ""),
      maintainer: String(data[1] ?? ""),
      amount: BigInt(data[2] ?? 0n),
    };
  }

  // Match: ("payout", "batch_alc")
  if (topic0 === "payout" && topic1 === "batch_alc") {
    const data = Array.isArray(rawVal) ? rawVal : [];
    return {
      type: "batch_alc",
      ...meta,
      orgId: String(data[0] ?? ""),
      admin: String(data[1] ?? ""),
      total: BigInt(data[2] ?? 0n),
    };
  }

  // Match: ("VeryPrince", "PayoutClaimed")
  if (topic0 === "VeryPrince" && topic1 === "PayoutClaimed") {
    const data = Array.isArray(rawVal) ? rawVal : [rawVal];
    return {
      type: "PayoutClaimed",
      ...meta,
      maintainer: String(data[0] ?? ""),
      amount: BigInt(data[1] ?? 0n),
    };
  }

  // Unknown event: return raw without dropping or throwing
  return {
    type: "unknown",
    ...meta,
    rawTopics,
    rawValue: rawVal,
  };
}

/**
 * Decodes a collection or RPC response of events.
 *
 * @param rpcEvents - Array of raw event responses or GetEventsResponse object
 * @returns Array of typed PrinceEvent instances
 */
export function parseEvents(rpcEvents: any): PrinceEvent[] {
  if (!rpcEvents) return [];

  const list = Array.isArray(rpcEvents)
    ? rpcEvents
    : Array.isArray(rpcEvents.events)
      ? rpcEvents.events
      : [];

  return list.map(parseEvent);
}
