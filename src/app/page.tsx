"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 bg-gray-100">
      <h1 className="text-3xl font-bold text-center">मज़दूर - ठेकेदार ऐप</h1>
      <p className="text-gray-600 text-center">अपना रोल चुनें</p>

      <button
        onClick={() => router.push("/worker")}
        className="bg-orange-500 text-white p-4 rounded-xl w-48 text-lg shadow-md flex items-center justify-center gap-2"
      >
        👷 मज़दूर
      </button>

      <button
        onClick={() => router.push("/contractor")}
        className="bg-green-600 text-white p-4 rounded-xl w-48 text-lg shadow-md flex items-center justify-center gap-2"
      >
        👨‍💼 ठेकेदार
      </button>
    </div>
  );
}
