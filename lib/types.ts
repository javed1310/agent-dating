import type {AgentProfile} from "./schema";import type {DateResult} from "./agents/date";
export type RunPerson={id:string;name:string;linkedin:string;instagram:string;profile:AgentProfile;embedding:number[]};
export type RunDate={id:string;aId:string;bId:string;similarity:number;result:DateResult};
export type RunRanking={personId:string;matchId:string;rank:number;score:number;reason:string;dateId:string};
export type DemoRun={id:string;createdAt:string;status:"complete";people:RunPerson[];dates:RunDate[];rankings:RunRanking[]};
