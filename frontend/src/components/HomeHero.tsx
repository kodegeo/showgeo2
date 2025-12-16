import React from "react";

const HomeHero: React.FC = () => {
  return (
    <section
      className="relative bg-cover bg-center text-white py-32"
      style={{ backgroundImage: "url('/assets/images/bg_home.png')" }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold mb-4">
          Experience Live Music Like Never Before
        </h1>
        <p className="text-lg mb-8">
          Join artists, creators, and fans on Showgeo — the future of live entertainment.
        </p>
        <div className="flex justify-center gap-4">
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium">
            Explore Events
          </button>
          <button className="bg-transparent border border-white px-6 py-3 rounded-md hover:bg-white/10">
            Become a Creator
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
