export default function Forbidden() {
  return <main className="mx-auto max-w-xl px-4 py-16 text-white"><h1 className="text-3xl font-bold">Access denied</h1><p className="mt-4 text-zinc-400">Your account does not have permission to access this resource.</p><form action="/api/auth/logout" method="post"><button className="ars-button mt-6">Sign out</button></form></main>;
}
