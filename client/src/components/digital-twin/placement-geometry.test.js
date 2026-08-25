import { describe,expect,it } from "vitest";
import { snapPlacement,validatePlacement } from "./placement-geometry.js";

const zone={id:"4",code:"ROBOT-01",name:"Zona e Robotikës"};
describe("Digital Twin placement geometry",()=>{
 it("snaps floor placement to the scene grid",()=>expect(snapPlacement({x:1.13,y:.4,z:3.37},"floor")).toEqual({x:1.25,y:.08,z:3.25}));
 it("accepts a clear point inside the selected zone",()=>expect(validatePlacement({position:{x:1.25,y:.08,z:3.25},zone,surface:"floor"}).valid).toBe(true));
 it("rejects points outside the selected zone",()=>expect(validatePlacement({position:{x:-7,y:.08,z:-4},zone,surface:"floor"}).reason).toMatch(/jashtë zonës/));
 it("rejects collisions with persisted assets",()=>expect(validatePlacement({position:{x:1.25,y:.08,z:3.25},zone,surface:"floor",placements:[{id:"8",position:{x:1.4,y:.08,z:3.2}}]}).reason).toMatch(/përplaset/));
});
