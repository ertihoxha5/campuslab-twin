import { BoxGeometry, Group, Mesh, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { modelTransform } from "./model-transforms.js";

describe("3D model grounding", () => {
  it("places the lowest point of a floor asset at zero after scaling", () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 4, 1));
    mesh.position.y = -3;
    root.add(mesh);
    const fit = modelTransform(root, 2);
    const lowestLocalY = -5;
    expect((lowestLocalY + fit.offset[1]) * fit.scale).toBeCloseTo(0);
    expect(fit.scale).toBeCloseTo(.5);
  });

  it("centers wall-mounted assets around their placement anchor", () => {
    const mesh = new Mesh(new BoxGeometry(1, 2, 1));
    mesh.position.y = 4;
    const fit = modelTransform(mesh, 1, false);
    const center = new Vector3(0, 4, 0);
    expect((center.y + fit.offset[1]) * fit.scale).toBeCloseTo(0);
  });
});
