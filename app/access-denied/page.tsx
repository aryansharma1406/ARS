export default async function AccessDenied({searchParams}:{searchParams:Promise<{reason?:string}>}) {
  const {reason}=await searchParams;
  return <main className="mx-auto max-w-xl px-4 py-16 text-white"><h1 className="text-3xl font-bold">Access unavailable</h1><p className="mt-4 text-zinc-400">{reason==='assignment'?'Your account needs an active venue assignment. Contact your ARS administrator.':'Authentication is not configured. Contact your ARS administrator.'}</p><form action="/api/auth/logout" method="post"><button className="ars-button mt-6">Sign out</button></form></main>;
}
