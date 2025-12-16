import React from "react";
import thumbnail from "@/assets/images/thumbnail.png";

const LiveSection: React.FC = () => {
  return (
    <section className="py-16 bg-dark text-white px-6">
      <h2 className="text-3xl font-bold mb-8 text-center">Now Streaming Live</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {[1, 2, 3].map((_, i) => (
          <div
            key={i}
            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition"
          >
            <img src={thumbnail} alt="Live Event" className="w-full h-56 object-cover" />
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">Live LIVE Series {i}</h3>
              <p className="text-gray-300 text-sm mb-4">
                Streaming now from Los Angeles, CA
              </p>
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md">
                Watch Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LiveSection;
