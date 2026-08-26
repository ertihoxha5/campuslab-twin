import { render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { api } from "@/api/client.js";
import { EquipmentVisualAssets } from "./EquipmentVisualAssets.jsx";

vi.mock("@/api/client.js",()=>({api:{get:vi.fn(),post:vi.fn(),delete:vi.fn()}}));
vi.mock("./AssetPreview.jsx",()=>({AssetPreview:({asset})=><div>Preview: {asset?.displayName??"Asnjë"}</div>}));
describe("EquipmentVisualAssets",()=>{beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue({data:{assets:[]}});});
 it("loads the persisted asset library",async()=>{api.get.mockResolvedValue({data:{assets:[{id:"8",displayName:"Robot UR5",assetKind:"model_3d",isPrimary:true}]}});render(<EquipmentVisualAssets equipmentId="31" canManage/>);expect(await screen.findByText("Preview: Robot UR5")).toBeInTheDocument();expect(api.get).toHaveBeenCalledWith("/api/equipment/31/visual-assets");});
 it("attaches a built-in asset through the real API",async()=>{const user=userEvent.setup();api.post.mockResolvedValue({data:{asset:{id:"9",displayName:"Karrige",assetKind:"built_in"}}});render(<EquipmentVisualAssets equipmentId="31" canManage/>);await user.click(await screen.findByRole("button",{name:"Përdor asetin"}));expect(api.post).toHaveBeenCalledWith("/api/equipment/31/visual-assets/built-in",{builtInKey:"chair",displayName:"Karrige"});await waitFor(()=>expect(api.get).toHaveBeenCalledTimes(2));});
 it("keeps mutation controls hidden for read-only users",async()=>{render(<EquipmentVisualAssets equipmentId="31" canManage={false}/>);await screen.findByText(/ende nuk ka aset/);expect(screen.queryByRole("button",{name:"Përdor asetin"})).not.toBeInTheDocument();});
});
