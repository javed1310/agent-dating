import {createHash} from "node:crypto";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";

const root=path.join(process.cwd(),".data","cache");
const key=(source:string,url:string)=>`${source}-${createHash("sha256").update(url).digest("hex").slice(0,24)}.json`;
export async function cached<T>(source:string,url:string,load:()=>Promise<T>):Promise<T>{
 await mkdir(root,{recursive:true});const file=path.join(root,key(source,url));
 try{return JSON.parse(await readFile(file,"utf8")) as T}catch{}
 const value=await load();await writeFile(file,JSON.stringify(value),"utf8");return value;
}
