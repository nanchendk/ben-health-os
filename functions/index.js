"use strict";
const crypto = require("node:crypto");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();
const key = defineSecret("BEN_HEALTH_SYNC_KEY");
const UID = "nwfOYCyATiWdtMhEsePN9vHdGsv1";
const DATE = /^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const WEEK = /^20\d{2}-W(0[1-9]|[1-4]\d|5[0-3])$/;
const allowed = {
 daily: new Set(["date","weightKg","sleepHours","sleepSegments","bedtime","nocturia","morningEnergy","foodNotes","proteinG","caloriesKcal","waterMl","exerciseNotes","resistanceMinutes","resistanceDone","gutNotes","gut","notes","dataQuality","excludeFromTrend","qualityNote","source"]),
 weeks: new Set(["week","startDate","endDate","averageWeightKg","startWeightKg","endWeightKg","minWeightKg","maxWeightKg","netChangeKg","summary","status","notes","source"])
};
function validDate(value){return typeof value==="string"&&DATE.test(value)&&!Number.isNaN(Date.parse(value+"T00:00:00Z"))&&new Date(value+"T00:00:00Z").toISOString().slice(0,10)===value;}
function validValue(v,depth=0){
 if(depth>4)return false;
 if(v===null||typeof v==="boolean")return true;
 if(typeof v==="number")return Number.isFinite(v)&&Math.abs(v)<1000000;
 if(typeof v==="string")return v.length<=4000;
 if(Array.isArray(v))return v.length<=30&&v.every(x=>validValue(x,depth+1));
 if(v&&typeof v==="object"&&Object.getPrototypeOf(v)===Object.prototype){const entries=Object.entries(v);return entries.length<=40&&entries.every(([k,x])=>/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(k)&&validValue(x,depth+1));}
 return false;
}
exports.healthSync = onRequest({region:"asia-east1",cors:false,secrets:[key],maxInstances:2,timeoutSeconds:30,invoker:"public"},async(req,res)=>{
 res.set("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"method_not_allowed"});
 const bearer=req.get("authorization")||"";
 const supplied=bearer.startsWith("Bearer ")?bearer.slice(7):"";
 const expected=key.value();
 const a=Buffer.from(supplied),b=Buffer.from(expected||"");
 if(!supplied||!expected||a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:"unauthorized"});
 if(Number(req.get("content-length")||0)>16000)return res.status(413).json({error:"payload_too_large"});
 const body=req.body;
 if(!body||typeof body!=="object"||Array.isArray(body))return res.status(400).json({error:"invalid_body"});
 const {kind,id,data}=body;
 if(!Object.hasOwn(allowed,kind)||typeof id!=="string"||!data||typeof data!=="object"||Array.isArray(data))return res.status(400).json({error:"invalid_record"});
 if(kind==="daily"?!validDate(id):!WEEK.test(id))return res.status(400).json({error:"invalid_id"});
 const fields=Object.entries(data);
 if(fields.length===0||fields.length>40||fields.some(([k,v])=>!allowed[kind].has(k)||!validValue(v)))return res.status(400).json({error:"invalid_fields"});
 if(kind==="daily"&&data.date!==undefined&&data.date!==id)return res.status(400).json({error:"date_mismatch"});
 if(kind==="weeks"&&data.week!==undefined&&data.week!==id)return res.status(400).json({error:"week_mismatch"});
 const record={...data,[kind==="daily"?"date":"week"]:id};
 const ref=admin.firestore().doc("users/"+UID+"/"+kind+"/"+id);
 try{
  await ref.set({...record,updatedAt:admin.firestore.FieldValue.serverTimestamp(),syncSource:"gpt-action"},{merge:true});
  return res.status(200).json({ok:true,kind,id,operation:"merged"});
 }catch(e){console.error("healthSync failed",e.code||e.message);return res.status(500).json({error:"write_failed"});}
});
