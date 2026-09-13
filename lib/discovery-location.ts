export type DiscoveryVenue = {id:string;name:string;location:string;latitude:number|null;longitude:number|null};
export type DiscoveryLocation = {latitude:number;longitude:number;recordedAt:number};
export const discoveryKey = 'ars-discovery-location-v1';
export const areaKey = 'ars-discovery-area-v1';
export function readDiscoveryLocation(): DiscoveryLocation | null {
 try {
  const value = JSON.parse(sessionStorage.getItem(discoveryKey) || 'null');
  if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude)>90 || Math.abs(value.longitude)>180 || !Number.isFinite(value.recordedAt) || Date.now()-value.recordedAt>3600000 || value.recordedAt>Date.now()) { sessionStorage.removeItem(discoveryKey); return null; }
  return value;
 } catch { return null; }
}
export function nearbyVenues(venues:DiscoveryVenue[], point:DiscoveryLocation) {
 const rad=(n:number)=>n*Math.PI/180;
 return venues.filter(v=>v.latitude !== null && v.longitude !== null && Number.isFinite(v.latitude) && Number.isFinite(v.longitude)).map(v=>{
  const a=Math.sin(rad(v.latitude!-point.latitude)/2)**2+Math.cos(rad(point.latitude))*Math.cos(rad(v.latitude!))*Math.sin(rad(v.longitude!-point.longitude)/2)**2;
  return {...v,distance:6371*2*Math.asin(Math.sqrt(Math.min(1,a)))};
 }).sort((a,b)=>a.distance-b.distance);
}
