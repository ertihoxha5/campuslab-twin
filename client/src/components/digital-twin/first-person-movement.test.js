import { describe, expect, it } from "vitest";
import {
  FIRST_PERSON_START,
  resolveFirstPersonMove,
} from "./first-person-movement.js";

describe("resolveFirstPersonMove", () => {
  it("keeps the viewer inside laboratory boundaries", () => {
    expect(
      resolveFirstPersonMove({ x: 6.5, y: 1.65, z: 3.9 }, { x: 2, z: 2 }),
    ).toEqual({ x: 6.55, y: 1.65, z: 4.05 });
  });

  it("prevents walking through a workstation", () => {
    const result = resolveFirstPersonMove(
      { x: 0, y: 1.65, z: 3.65 },
      { x: 0, z: -2 },
    );
    expect(result.z).toBe(3.65);
  });

  it("preserves the fixed eye height", () => {
    expect(
      resolveFirstPersonMove(FIRST_PERSON_START, { x: 0.2, z: 0 }),
    ).toMatchObject({ y: 1.65 });
  });
});
