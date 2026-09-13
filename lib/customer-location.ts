'use server';
import {requireRole} from './auth';
export async function recordCustomerLocation(status:'allowed'|'denied'|'skipped'|'unavailable',latitude?:number,longitude?:number){
 const auth=await requireRole('customer');
 if(!['allowed','denied','skipped','unavailable'].includes(status))throw new Error('Invalid location choice.');
 if(status==='allowed'&&(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude!)>90||Math.abs(longitude!)>180))throw new Error('Location could not be recorded.');
 const {error}=await auth.client.rpc('record_customer_location',{choice:status,lat:status==='allowed'?Math.round(latitude!*100)/100:null,lng:status==='allowed'?Math.round(longitude!*100)/100:null});
 if(error)throw new Error('Your location choice could not be saved. You can retry or continue without saving. ARS may need to apply the location database migration.');
}
