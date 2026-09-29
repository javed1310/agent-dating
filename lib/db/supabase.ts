import "server-only";import {createClient} from "@supabase/supabase-js";
export function db(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;if(!url||!key)throw new Error("Supabase is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
export async function enqueue(type:string,payload:Record<string,unknown>,runAfter?:string){const {error}=await db().from("jobs").insert({type,payload,status:"pending",run_after:runAfter||new Date().toISOString()});if(error)throw error}
