import { describe, expect, it } from "vitest";
import { parseEvents } from "../src/events.js";

describe("Events module", () => {
  it("decodes org_registered event", () => {
    const rawEvents = [
      {
        topic: ["VeryPrince", "org_registered"],
        value: ["aether_dao", "GBZC6Y2Y7Q3ZQ2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4"],
        ledger: 100,
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      type: "org_registered",
      orgId: "aether_dao",
      admin: "GBZC6Y2Y7Q3ZQ2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4",
      ledger: 100,
    });
  });

  it("decodes OrgMetadataUpdated event", () => {
    const rawEvents = [
      {
        topic: ["VeryPrince", "OrgMetadataUpdated"],
        value: ["aether_dao", "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"],
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed[0]).toMatchObject({
      type: "OrgMetadataUpdated",
      orgId: "aether_dao",
      metadataCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    });
  });

  it("decodes OrgFunded event", () => {
    const rawEvents = [
      {
        topic: ["VeryPrince", "OrgFunded"],
        value: ["aether_dao", "G_DONOR", 50000000n],
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed[0]).toMatchObject({
      type: "OrgFunded",
      orgId: "aether_dao",
      from: "G_DONOR",
      amount: 50000000n,
    });
  });

  it("decodes AdminAdded and AdminRemoved events", () => {
    const rawEvents = [
      {
        topic: ["VeryPrince", "AdminAdded"],
        value: ["aether_dao", "G_NEW_ADMIN"],
      },
      {
        topic: ["VeryPrince", "AdminRemoved"],
        value: ["aether_dao", "G_OLD_ADMIN"],
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed[0]).toMatchObject({
      type: "AdminAdded",
      orgId: "aether_dao",
      newAdmin: "G_NEW_ADMIN",
    });
    expect(parsed[1]).toMatchObject({
      type: "AdminRemoved",
      orgId: "aether_dao",
      adminToRemove: "G_OLD_ADMIN",
    });
  });

  it("decodes MaintainerAdded event", () => {
    const rawEvents = [
      {
        topic: ["VeryPrince", "MaintainerAdded"],
        value: ["aether_dao", "G_MAINTAINER"],
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed[0]).toMatchObject({
      type: "MaintainerAdded",
      orgId: "aether_dao",
      maintainer: "G_MAINTAINER",
    });
  });

  it("decodes PayoutAllocated event", () => {
    const rawEvents = [
      {
        topic: ["VeryPrince", "PayoutAllocated"],
        value: ["aether_dao", "G_MAINTAINER", 25000000n],
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed[0]).toMatchObject({
      type: "PayoutAllocated",
      orgId: "aether_dao",
      maintainer: "G_MAINTAINER",
      amount: 25000000n,
    });
  });

  it("decodes batch_alc event", () => {
    const rawEvents = [
      {
        topic: ["payout", "batch_alc"],
        value: ["aether_dao", "G_ADMIN", 100000000n],
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed[0]).toMatchObject({
      type: "batch_alc",
      orgId: "aether_dao",
      admin: "G_ADMIN",
      total: 100000000n,
    });
  });

  it("decodes PayoutClaimed event", () => {
    const rawEvents = [
      {
        topic: ["VeryPrince", "PayoutClaimed"],
        value: ["G_MAINTAINER", 30000000n],
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed[0]).toMatchObject({
      type: "PayoutClaimed",
      maintainer: "G_MAINTAINER",
      amount: 30000000n,
    });
  });

  it("retains unknown events as raw without throwing or dropping", () => {
    const rawEvents = [
      {
        topic: ["UnknownContract", "SomeTopic"],
        value: { foo: "bar" },
      },
    ];
    const parsed = parseEvents(rawEvents);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.type).toBe("unknown");
    expect((parsed[0] as any).rawTopics).toEqual(["UnknownContract", "SomeTopic"]);
    expect((parsed[0] as any).rawValue).toEqual({ foo: "bar" });
  });
});
