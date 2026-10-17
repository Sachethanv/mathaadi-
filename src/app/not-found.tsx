import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-8 text-center">
      <p className="kn text-3xl font-bold">ಅಯ್ಯೋ!</p>
      <h1 className="mt-2 text-xl font-bold">That page isn&apos;t here</h1>
      <Link href="/" className="mt-6 rounded-full bg-brand px-6 py-3 font-semibold text-on-brand">Back to scenes</Link>
    </main>
  );
}
