export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div>
      <p className="mt-4 text-lg text-gray-300">楽器の音源を読み込んでいます...</p>
    </div>
  );
}