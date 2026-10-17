export const metadata = { title: "Offline · Maathaadi" };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-8 text-center">
      <div className="kn grid h-16 w-16 place-items-center rounded-3xl bg-brand text-2xl font-bold text-on-brand">ಮಾ</div>
      <h1 className="mt-5 text-2xl font-extrabold">You&apos;re offline</h1>
      <p className="mt-2 text-muted">Conversations need the internet to hear you and reply. Your progress is safe on this phone.</p>
      <p className="kn mt-6 text-lg font-semibold">ಸ್ವಲ್ಪ ಆಮೇಲೆ ಮಾತಾಡೋಣ!</p>
      <p className="text-sm text-muted">Let&apos;s talk a little later!</p>
      {/* A full reload, so the browser retries the network. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="mt-8 rounded-full bg-brand px-6 py-3 font-semibold text-on-brand">Try again</a>
    </main>
  );
}
