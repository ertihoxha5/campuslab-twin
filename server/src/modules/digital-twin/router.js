import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { createLaboratoryAccess } from "../../middleware/require-laboratory-access.js";
import { requireAnyPermission,requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

const context=request=>({universityId:request.auth.universityId,userId:request.auth.userId,roles:request.auth.roles,ipAddress:request.ip?.slice(0,45)??null});
export function createDigitalTwinRouter({service,authenticateTenant,laboratoryAccessRepository}){const router=Router();router.use(authenticateTenant);router.use("/:laboratoryId",createLaboratoryAccess({laboratoryAccessRepository}));
  router.get("/:laboratoryId/assets",requirePermissions(permissions.LABORATORIES_VIEW),async(req,res)=>success(res,{data:{assets:await service.listAssets(req.params.laboratoryId,context(req))}}));
  router.get("/:laboratoryId/asset-library",requirePermissions(permissions.LABORATORIES_VIEW),async(req,res)=>success(res,{data:{assets:await service.listAssetLibrary(req.params.laboratoryId,context(req))}}));
  router.post("/:laboratoryId/assets",requireAnyPermission(permissions.ASSETS_MANAGE,permissions.ASSETS_MAINTAIN),async(req,res)=>success(res,{status:201,data:{asset:await service.createAsset(req.params.laboratoryId,req.body,context(req))}}));
  router.put("/:laboratoryId/assets/:assetId",requireAnyPermission(permissions.ASSETS_MANAGE,permissions.ASSETS_MAINTAIN),async(req,res)=>success(res,{data:{asset:await service.updateAsset(req.params.laboratoryId,req.params.assetId,req.body,context(req))}}));
  router.delete("/:laboratoryId/assets/:assetId",requireAnyPermission(permissions.ASSETS_MANAGE,permissions.ASSETS_MAINTAIN),async(req,res)=>success(res,{data:{asset:await service.deleteAsset(req.params.laboratoryId,req.params.assetId,context(req))}}));
  router.get("/:laboratoryId/events",requirePermissions(permissions.MONITORING_VIEW),async(req,res)=>success(res,{data:{events:await service.listEvents(req.params.laboratoryId,req.query,context(req))}}));
  router.get("/:laboratoryId/messages",requirePermissions(permissions.MONITORING_VIEW),async(req,res)=>success(res,{data:{messages:await service.listMessages(req.params.laboratoryId,req.query,context(req))}}));
  router.post("/:laboratoryId/messages",requirePermissions(permissions.MONITORING_VIEW),async(req,res)=>success(res,{status:201,data:{message:await service.createMessage(req.params.laboratoryId,req.body,context(req))}}));return router;}
