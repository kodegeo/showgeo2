import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface ProfileSectionProps {
  title: string;
  children: ReactNode;
  viewAllPath?: string;
  viewAllLabel?: string;
}

export function ProfileSection({ title, children, viewAllPath, viewAllLabel }: ProfileSectionProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-heading font-bold text-white uppercase tracking-tight relative inline-block">
          {title}
          <span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-[#F49600]"></span>
        </h2>
        {viewAllPath && (
          <Link
            to={viewAllPath}
            className="text-sm text-[#CD000E] hover:text-[#860005] font-body font-semibold uppercase tracking-wider transition-colors"
          >
            {viewAllLabel || "View All"} →
          </Link>
        )}
      </div>
      <div className="overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <style>{`
          .profile-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="flex gap-4 pb-4 profile-scroll">
          {children}
        </div>
      </div>
    </section>
  );
}

