"use client";

import { useRouter } from "next/navigation";
import AudioButton from "@/components/AudioButton";
import Image from "next/image";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function WelcomePage() {
  const router = useRouter();

  // Pie chart data – Workers Problem Breakdown
  const pieData = [
    { name: "No Work", value: 40 },
    { name: "Commission Exploitation", value: 25 },
    { name: "Road Blocking", value: 15 },
    { name: "Fights / Violence", value: 10 },
    { name: "Injuries / Deaths", value: 10 },
  ];
  const pieColors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#9D4EDD"];

  // Bar chart data – Digital Bharat Growth Projection
  const barData = [
    { year: "2025", growth: 20 },
    { year: "2026", growth: 35 },
    { year: "2027", growth: 50 },
    { year: "2028", growth: 65 },
    { year: "2029", growth: 80 },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-6">
      {/* Hero Section */}
      <h1 className="text-4xl md:text-5xl font-bold mt-6 mb-4 text-gray-900">
        👷‍♂️ Workers / ठेकेदार App
      </h1>
      <p className="text-lg md:text-xl mb-4 text-gray-700">
        स्वागत है! <AudioButton text="स्वागत है! कृपया नीचे से विकल्प चुनें" />
      </p>

      {/* Hero Image */}
      <div className="relative w-full max-w-4xl h-72 md:h-96 mb-8 rounded-2xl overflow-hidden shadow-lg">
        <Image
          src="/workers.jpg"
          alt="Workers"
          layout="fill"
          objectFit="cover"
        />
      </div>

      {/* Problem Statement */}
      <div className="max-w-4xl text-left mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          🚧 समस्या – Gurugram और भारतभर के मजदूरों की हकीकत
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          हर रोज़ हज़ारों मजदूर Gurugram के{" "}
          <b>labour chowks</b> पर काम की तलाश में खड़े रहते हैं। सड़कों पर
          जाम, मारपीट, कमीशनखोरी, और असुरक्षित माहौल – यह आम समस्या बन चुकी है।
          बहुत से मजदूरों को काम नहीं मिलता, और जो मिलता है उनमें से भी 30% तक
          कमाई दलाल खा जाते हैं। कई बार मजदूर काम के दौरान{" "}
          <b>जख्मी हो जाते हैं या अपनी जान गवा बैठते हैं।</b>
        </p>
        <p className="text-gray-700 leading-relaxed">
          Workers App इस समस्या का डिजिटल समाधान है –{" "}
          <b>बिना labour chowk जाए, मजदूर सीधे मोबाइल से काम पाएंगे।</b> न रोड
          ब्लॉक होगा, न दलालों का कमीशन जाएगा।
        </p>
      </div>

      {/* Impact Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-5xl w-full">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl p-6 shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            मजदूरों की समस्याएँ (% में)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            Digital Bharat / Aatmanirbhar Bharat Impact
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="growth" fill="#4D96FF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Emergency Feature */}
      <div className="max-w-4xl bg-red-50 border-l-4 border-red-600 p-6 rounded-lg shadow mb-12 text-left">
        <h2 className="text-2xl font-semibold mb-2 text-red-700">
          🚨 In-Built Emergency Button
        </h2>
        <p className="text-gray-700">
          काम के दौरान किसी भी दुर्घटना, चोट या विवाद की स्थिति में{" "}
          <b>Workers App का Emergency Button</b> तुरंत मदद बुलाता है। यह मजदूरों
          की <b>सुरक्षा और जीवन रक्षा</b> के लिए एक क्रांतिकारी फीचर है।
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push("/auth/sign-up")}
          className="w-full bg-green-600 text-white py-3 rounded-lg mb-4 text-lg shadow hover:bg-green-700 transition"
        >
          नया खाता बनाएँ
        </button>

        <button
          onClick={() => router.push("/auth/sign-in")}
          className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg shadow hover:bg-blue-700 transition"
        >
          लॉगिन करें
        </button>
      </div>
    </div>
  );
}
