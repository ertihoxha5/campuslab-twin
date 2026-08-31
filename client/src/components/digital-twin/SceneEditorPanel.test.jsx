import { render,screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe,expect,it,vi } from "vitest";
import { SceneEditorPanel } from "./SceneEditorPanel.jsx";
const placement={id:"12",name:"Karrige 01",zoneId:"4",zoneName:"Zona e Mësimit",status:"online"};
const library={visualAssetId:"7",equipmentId:"31",name:"Karrige 01",displayName:"Karrige",type:"Mobilje",zoneId:"4",assetKind:"model_3d",has3dModel:true,placedCount:1};
const zones=[{id:"zone-4",sourceId:"4",name:"Zona e Mësimit",code:"MESIM-01"}];
describe("SceneEditorPanel",()=>{
 it("selects hierarchy objects and exposes transform actions",async()=>{const user=userEvent.setup(),onSelect=vi.fn(),onTransformMode=vi.fn(),onDuplicate=vi.fn();render(<SceneEditorPanel zones={zones} operations={{placements:[placement],library:[library]}} selection={{kind:"placement",item:placement}} onSelect={onSelect} onAdd={vi.fn()} canManage transformMode="translate" onTransformMode={onTransformMode} onReset={vi.fn()} onDuplicate={onDuplicate} onDelete={vi.fn()}/>);await user.click(screen.getByRole("button",{name:"Karrige 01"}));expect(onSelect).toHaveBeenCalled();await user.click(screen.getByTitle("Rrotullo"));expect(onTransformMode).toHaveBeenCalledWith("rotate");await user.click(screen.getByTitle("Dyfisho"));expect(onDuplicate).toHaveBeenCalled();});
 it("adds only a scene-ready library model",async()=>{const user=userEvent.setup(),onAdd=vi.fn();render(<SceneEditorPanel zones={zones} operations={{placements:[],library:[library]}} selection={null} onSelect={vi.fn()} onAdd={onAdd} canManage transformMode="translate" onTransformMode={vi.fn()}/>);await user.click(screen.getByRole("button",{name:"Asset Library"}));await user.click(screen.getByRole("button",{name:"Shto Karrige 01 në skenë"}));expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({parentEquipmentId:"31",visualAssetId:"7"}));});
});
