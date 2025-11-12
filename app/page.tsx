import Flow from "./components/Flow";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-7xl flex-col items-stretch gap-6 p-6 sm:p-12">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Skill Tree Builder
        </h1>
        <div className="text-sm text-zinc-500 dark:text-zinc-700">
        <Flow />
        </div>
      </main>
    </div>
  );
}
