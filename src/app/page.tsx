import Link from "next/link";

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-intro" aria-labelledby="home-title">
        <div>
          <h1 id="home-title">Outfit Visual Studio</h1>
          <p>AI visual workflow for outfit content.</p>
        </div>
        <Link className="primary-action" href="/studio">
          Open Studio
        </Link>
      </section>
    </main>
  );
}
