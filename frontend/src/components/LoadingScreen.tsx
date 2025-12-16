interface LoadingScreenProps {
    message?: string;
  }
  
  export function LoadingScreen({ message = "Loading…" }: LoadingScreenProps) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#CD000E] mx-auto mb-4" />
          <p className="text-[#9A9A9A] text-sm">{message}</p>
        </div>
      </div>
    );
  }
  