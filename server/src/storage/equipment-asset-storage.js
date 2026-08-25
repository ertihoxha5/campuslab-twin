import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
export function createEquipmentAssetStorage({uploadsDirectory=path.join(serverDirectory,"uploads")}={}){return{
 async save({universityId,equipmentId,file,extension}){const directory=path.join(uploadsDirectory,"universities",String(universityId),"equipment",String(equipmentId));const storedName=`${randomUUID()}${extension}`;const absolutePath=path.join(directory,storedName);await fs.mkdir(directory,{recursive:true});await fs.writeFile(absolutePath,file.buffer,{flag:"wx"});return{storedName,relativePath:path.relative(serverDirectory,absolutePath).replaceAll(path.sep,"/"),checksumSha256:createHash("sha256").update(file.buffer).digest("hex")};},
 async remove(relativePath){const absolutePath=path.resolve(serverDirectory,relativePath),root=path.resolve(uploadsDirectory);if(!absolutePath.startsWith(`${root}${path.sep}`))throw new Error("Rruga e asetit nuk është brenda uploads.");await fs.rm(absolutePath,{force:true});}
};}
