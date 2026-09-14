import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// Small encrypted chunks avoid platform-specific limits on individual keychain values.
// Publish the manifest last: an interrupted write leaves the previous session intact.
const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
let queue:Promise<unknown>=Promise.resolve();
function serial<T>(work:()=>Promise<T>):Promise<T>{const result=queue.then(work,work);queue=result.catch(()=>{});return result;}
type Manifest={version:string;count:number};
const safe=(key:string)=>key.replace(/[^a-zA-Z0-9._-]/g,'_');
async function manifest(key:string):Promise<Manifest|null>{const raw=await SecureStore.getItemAsync(safe(key),options);return raw?JSON.parse(raw):null;}
async function erase(key:string,m:Manifest|null){if(m)for(let i=0;i<m.count;i++)await SecureStore.deleteItemAsync(`${safe(key)}.${m.version}.${i}`,options);}
export const secureStorage={
 getItem:(key:string)=>serial(async()=>{const m=await manifest(key);if(!m)return null;let value='';for(let i=0;i<m.count;i++){const part=await SecureStore.getItemAsync(`${safe(key)}.${m.version}.${i}`,options);if(part===null)throw new Error('Secure session storage is incomplete.');value+=part;}return value;}),
 setItem:(key:string,value:string)=>serial(async()=>{const old=await manifest(key);const m={version:Crypto.randomUUID(),count:Math.ceil(value.length/400)};for(let i=0;i<m.count;i++)await SecureStore.setItemAsync(`${safe(key)}.${m.version}.${i}`,value.slice(i*400,(i+1)*400),options);await SecureStore.setItemAsync(safe(key),JSON.stringify(m),options);await erase(key,old);}),
 removeItem:(key:string)=>serial(async()=>{const old=await manifest(key);await SecureStore.deleteItemAsync(safe(key),options);await erase(key,old);})
};
