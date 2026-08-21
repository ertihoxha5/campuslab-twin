import assert from "node:assert/strict";
import test from "node:test";
import { createDigitalTwinService } from "./service.js";

const context={universityId:"7",userId:"11",roles:["technician"]};
test("normalizes persisted placement vectors",async()=>{const service=createDigitalTwinService({repository:{listAssets:async()=>[{id:3,laboratoryId:2,zoneId:4,positionX:"1.25",positionY:"2.2",positionZ:"-3",rotationX:"0",rotationY:"1.5",rotationZ:"0"}]}});const [asset]=await service.listAssets("2",context);assert.deepEqual(asset.position,{x:1.25,y:2.2,z:-3});assert.equal(asset.id,"3");});
test("blocks technicians from administrator chat",async()=>{const service=createDigitalTwinService({repository:{listMessages:async()=>[]}});await assert.rejects(()=>service.listMessages("2",{channel:"administrators"},context),(error)=>error.status===403);});
test("publishes a persisted chat message",async()=>{let published;const service=createDigitalTwinService({repository:{createMessage:async()=>({id:9,channel:"technical",messageText:"Kontrollo robotin"})},realtimePublisher:{publishTwinEvent:event=>{published=event;}}});const message=await service.createMessage("2",{channel:"technical",messageText:"Kontrollo robotin"},context);assert.equal(message.id,"9");assert.equal(published.eventName,"twin:message-created");assert.equal(published.universityId,"7");});
