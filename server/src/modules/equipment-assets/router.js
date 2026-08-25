import { Router } from "express";
import multer from "multer";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";
import { AppError } from "../../utils/app-error.js";

const upload=multer({storage:multer.memoryStorage(),limits:{files:1,fileSize:25*1024*1024}});
const receiveAsset=(request,response,next)=>upload.single("asset")(request,response,error=>{if(error?.code==="LIMIT_FILE_SIZE")return next(new AppError({status:422,code:"ASSET_TOO_LARGE",message:"Aseti nuk mund të jetë më i madh se 25 MB."}));return next(error);});
const context=request=>({universityId:request.auth.universityId,userId:request.auth.userId,roles:request.auth.roles,ipAddress:request.ip?.slice(0,45)??null});
export function createEquipmentAssetRouter({service,authenticateTenant}){const router=Router({mergeParams:true});router.use(authenticateTenant);
 router.get("/",requirePermissions(permissions.LABORATORIES_VIEW),async(request,response)=>success(response,{data:{assets:await service.list(request.params.equipmentId,context(request))}}));
 router.post("/upload",requirePermissions(permissions.ASSETS_MANAGE),receiveAsset,async(request,response)=>success(response,{status:201,data:{asset:await service.upload(request.params.equipmentId,request.file,request.body,context(request))}}));
 router.post("/built-in",requirePermissions(permissions.ASSETS_MANAGE),async(request,response)=>success(response,{status:201,data:{asset:await service.attachBuiltIn(request.params.equipmentId,request.body,context(request))}}));
 router.delete("/:assetId",requirePermissions(permissions.ASSETS_MANAGE),async(request,response)=>success(response,{data:{asset:await service.remove(request.params.equipmentId,request.params.assetId,context(request))}}));return router;}
