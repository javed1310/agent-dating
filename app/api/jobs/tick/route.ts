import {NextResponse} from "next/server";import {tick} from "@/lib/jobs/worker";
export const maxDuration=30;export async function POST(){try{return NextResponse.json({job:await tick()})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Worker failed"},{status:500})}}
